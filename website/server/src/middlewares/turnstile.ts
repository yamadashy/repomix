import type { Context, Next } from 'hono';
import { PACK_EVENT, type PackOutcome } from '../actions/packEventSchema.js';
import { MESSAGES } from '../actions/packRequestMessages.js';
import { getClientInfo } from '../utils/clientInfo.js';
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
// (or a future widget) can't be replayed at /api/pack.
const EXPECTED_ACTION = 'pack';

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
// - siteverify network failure → 403 with `outcome: turnstile_failed` (fail-
//   closed; if Cloudflare can't verify, treat as untrusted).
// - Action claim mismatch → 403 (token wasn't minted for /api/pack).
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

    const secret = deps.getSecret();
    if (!secret) {
      if (deps.isProduction()) {
        logWarning('TURNSTILE_SECRET_KEY not set in production', {
          event: PACK_EVENT,
          outcome: 'turnstile_failed' satisfies PackOutcome,
          reason: 'secret_missing',
          requestId,
          source: clientInfo.source,
          ...(cf && { cf }),
        });
        return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
      }
      if (!secretMissingLogged) {
        secretMissingLogged = true;
        logWarning('TURNSTILE_SECRET_KEY not set — Turnstile verification skipped (non-production)');
      }
      await next();
      return;
    }

    const rawToken = c.req.header(TOKEN_HEADER);
    const token = rawToken?.trim();

    if (!token) {
      logInfo('Turnstile token missing', {
        event: PACK_EVENT,
        outcome: 'turnstile_failed' satisfies PackOutcome,
        reason: 'missing_token',
        requestId,
        source: clientInfo.source,
        ...(cf && { cf }),
      });
      return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
    }

    if (token.length > MAX_TOKEN_LENGTH) {
      // Defensive: oversized tokens are guaranteed-invalid per Cloudflare's
      // spec. Reject without spending a siteverify call.
      logInfo('Turnstile token rejected: oversized', {
        event: PACK_EVENT,
        outcome: 'turnstile_failed' satisfies PackOutcome,
        reason: 'token_too_long',
        tokenLength: token.length,
        requestId,
        source: clientInfo.source,
        ...(cf && { cf }),
      });
      return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
    }

    let verifyResult: SiteverifyResponse | undefined;
    try {
      // remoteip is optional in Cloudflare's siteverify API. clientInfo.ip
      // falls back to '0.0.0.0' when no IP header was present — sending that
      // sentinel doesn't help Cloudflare's risk scoring and can confuse their
      // validation, so omit the field entirely in that case.
      const body = new URLSearchParams({ secret, response: token });
      if (clientInfo.ip && clientInfo.ip !== '0.0.0.0') {
        body.set('remoteip', clientInfo.ip);
      }
      const res = await deps.fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      });
      verifyResult = (await res.json()) as SiteverifyResponse;
    } catch (error) {
      logWarning('Turnstile siteverify network failure', {
        event: PACK_EVENT,
        outcome: 'turnstile_failed' satisfies PackOutcome,
        reason: 'siteverify_unavailable',
        requestId,
        source: clientInfo.source,
        error: error instanceof Error ? error.message : String(error),
        ...(cf && { cf }),
      });
      return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
    }

    if (!verifyResult?.success) {
      logInfo('Turnstile verification rejected', {
        event: PACK_EVENT,
        outcome: 'turnstile_failed' satisfies PackOutcome,
        reason: 'siteverify_rejected',
        errorCodes: verifyResult?.['error-codes'],
        requestId,
        source: clientInfo.source,
        ...(cf && { cf }),
      });
      return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
    }

    // Action claim binding: only present on tokens minted with `data-action`
    // on the widget. Cloudflare's test sitekey echoes whatever action the
    // client supplied (or undefined if none), so we accept undefined as a
    // backward-compat fallback for older client builds. The strict check kicks
    // in once the client started sending an action.
    if (verifyResult.action !== undefined && verifyResult.action !== EXPECTED_ACTION) {
      logInfo('Turnstile verification rejected: action mismatch', {
        event: PACK_EVENT,
        outcome: 'turnstile_failed' satisfies PackOutcome,
        reason: 'action_mismatch',
        action: verifyResult.action,
        requestId,
        source: clientInfo.source,
        ...(cf && { cf }),
      });
      return c.json(createErrorResponse(MESSAGES.TURNSTILE_FAILED, requestId), 403);
    }

    await next();
  };
}
