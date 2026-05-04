import type { Context, Next } from 'hono';
import { PACK_EVENT, type PackOutcome } from '../actions/packEventSchema.js';
import { MESSAGES } from '../actions/packRequestMessages.js';
import { type ClientInfo, getClientInfo } from '../utils/clientInfo.js';
import { createErrorResponse } from '../utils/http.js';
import { buildCfLogField, logInfo, logWarning } from '../utils/logger.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TOKEN_HEADER = 'X-Turnstile-Token';
// Cloudflare-recommended timeout: siteverify normally returns in <100ms; a
// hung verify call must not stall the pack flow. Returning 403 on timeout is
// safer than failing open per request.
const SITEVERIFY_TIMEOUT_MS = 5_000;
// Cloudflare's documented upper bound for Turnstile tokens. Anything longer is
// guaranteed-invalid and should be rejected before we call siteverify.
const MAX_TOKEN_LENGTH = 2048;
// Action claim the client widget binds when calling turnstile.render — the
// server requires this exact value so a token issued for some other endpoint
// (or a future widget) can't be replayed at /api/pack. The matching client-
// side string is in `useTurnstile.ts` (`data-action='pack'` on the widget);
// see `tests/turnstile.test.ts` for the cross-stack contract assertion.
export const EXPECTED_TURNSTILE_ACTION = 'pack';
// Hostnames we expect tokens to be minted from. Must match the site
// configured in the Cloudflare Turnstile dashboard. Tokens minted on other
// hostnames (e.g. a leaked sitekey reused on attacker's domain) will be
// rejected. The test sitekey returns no hostname, so undefined is allowed
// for backward-compat.
const ALLOWED_HOSTNAMES: readonly string[] = ['repomix.com'];

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
  challenge_ts?: string;
  action?: string;
}

interface TurnstileDeps {
  fetch: typeof fetch;
  getSecret: () => string | undefined;
  isProduction: () => boolean;
}

const defaultDeps: TurnstileDeps = {
  fetch: globalThis.fetch,
  getSecret: () => process.env.TURNSTILE_SECRET_KEY,
  isProduction: () => process.env.NODE_ENV === 'production',
};

// Verify Cloudflare Turnstile tokens before /api/pack runs the actual pack.
// Tokens are 1-shot (5min validity) and must be re-issued by the client widget
// per request — the middleware doesn't cache verifications.
//
// Behaviour:
// - TURNSTILE_SECRET_KEY unset:
//   - In production → fail-closed (403 with `reason: secret_missing`). Missing
//     config in production is a deployment bug, not a normal state.
//   - In dev/test → fail-open (skip verification, warn once). Keeps local
//     contributors and preview environments unblocked.
// - Token missing / empty / oversized → 403 with `outcome: turnstile_failed`.
// - siteverify success: false → 403 with `outcome: turnstile_failed`.
// - siteverify network failure / non-JSON → 403 with `outcome:
//   turnstile_failed` (fail-closed; if Cloudflare can't verify, treat as
//   untrusted).
// - Action / hostname claim mismatch → 403 (token wasn't minted for /api/pack
//   or was minted on a different domain).
//
// Placement: applied to /api/pack only — docs pages, health checks, and any
// future public read-only endpoints stay challenge-free so SEO/LLMO crawlers
// (Googlebot, GPTBot, etc.) are unaffected.
export function turnstileMiddleware(deps: TurnstileDeps = defaultDeps) {
  let secretMissingLogged = false;

  return async function turnstileMiddleware(c: Context, next: Next) {
    const requestId = c.get('requestId');
    const clientInfo = getClientInfo(c);
    const cf = buildCfLogField(clientInfo);

    // Single failure-logging shape used by every reject branch — keeps the
    // event/outcome/source/cf envelope consistent and makes it harder to
    // forget a field when adding the next reason.
    const rejectAndLog = (
      reason: string,
      logMessage: string,
      level: 'info' | 'warn' = 'info',
      extra?: Record<string, unknown>,
    ) => {
      const payload = {
        event: PACK_EVENT,
        outcome: 'turnstile_failed' satisfies PackOutcome,
        reason,
        requestId,
        source: clientInfo.source,
        ...(cf && { cf }),
        ...extra,
      };
      if (level === 'warn') logWarning(logMessage, payload);
      else logInfo(logMessage, payload);
      return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
    };

    const secret = deps.getSecret();
    if (!secret) {
      if (deps.isProduction()) {
        return rejectAndLog('secret_missing', 'TURNSTILE_SECRET_KEY not set in production', 'warn');
      }
      if (!secretMissingLogged) {
        secretMissingLogged = true;
        logWarning('TURNSTILE_SECRET_KEY not set — Turnstile verification skipped (non-production)');
      }
      await next();
      return;
    }

    const token = c.req.header(TOKEN_HEADER)?.trim();

    if (!token) {
      return rejectAndLog('missing_token', 'Turnstile token missing');
    }

    if (token.length > MAX_TOKEN_LENGTH) {
      // Defensive: oversized tokens are guaranteed-invalid per Cloudflare's
      // spec. Reject without spending a siteverify call.
      return rejectAndLog('token_too_long', 'Turnstile token rejected: oversized', 'info', {
        tokenLength: token.length,
      });
    }

    const verifyResult = await runSiteverify(deps, secret, token, clientInfo);
    if (verifyResult instanceof Error) {
      return rejectAndLog('siteverify_unavailable', 'Turnstile siteverify network failure', 'warn', {
        error: verifyResult.message,
      });
    }

    if (!verifyResult?.success) {
      return rejectAndLog('siteverify_rejected', 'Turnstile verification rejected', 'info', {
        errorCodes: verifyResult?.['error-codes'],
      });
    }

    // Action claim binding: only present on tokens minted with `data-action`
    // on the widget. Cloudflare's test sitekey echoes whatever action the
    // client supplied (or undefined if none), so we accept undefined as a
    // backward-compat fallback for older client builds. The strict check kicks
    // in once the client started sending an action.
    if (verifyResult.action !== undefined && verifyResult.action !== EXPECTED_TURNSTILE_ACTION) {
      return rejectAndLog('action_mismatch', 'Turnstile verification rejected: action mismatch', 'info', {
        action: verifyResult.action,
      });
    }

    // Hostname claim binding: defends against a leaked sitekey being used on
    // an attacker-controlled origin. Test sitekeys omit hostname, so allow
    // undefined for backward-compat (same pattern as the action check).
    if (verifyResult.hostname !== undefined && !ALLOWED_HOSTNAMES.includes(verifyResult.hostname)) {
      return rejectAndLog('hostname_mismatch', 'Turnstile verification rejected: hostname mismatch', 'info', {
        hostname: verifyResult.hostname,
      });
    }

    await next();
  };
}

// Wrap the siteverify call so the middleware body stays focused on policy.
// Returns the parsed body on success or an Error sentinel on any failure
// (network error, non-JSON response, abort) so the caller can fail-closed
// uniformly without distinguishing failure modes — they all map to 403.
async function runSiteverify(
  deps: TurnstileDeps,
  secret: string,
  token: string,
  clientInfo: ClientInfo,
): Promise<SiteverifyResponse | Error> {
  // remoteip is optional in Cloudflare's siteverify API. clientInfo.ip falls
  // back to '0.0.0.0' when no IP header was present — sending that sentinel
  // doesn't help Cloudflare's risk scoring and can confuse their validation,
  // so omit the field entirely in that case.
  const body = new URLSearchParams({ secret, response: token });
  if (clientInfo.ip && clientInfo.ip !== '0.0.0.0') {
    body.set('remoteip', clientInfo.ip);
  }
  try {
    const res = await deps.fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    return (await res.json()) as SiteverifyResponse;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}
