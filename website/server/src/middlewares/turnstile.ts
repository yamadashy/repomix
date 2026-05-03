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
}

const defaultDeps: TurnstileDeps = {
  fetch: globalThis.fetch,
  getSecret: () => process.env.TURNSTILE_SECRET_KEY,
};

// Verify Cloudflare Turnstile tokens before /api/pack runs the actual pack.
// Tokens are 1-shot (5min validity) and must be re-issued by the client widget
// per request — the middleware doesn't cache verifications.
//
// Behaviour:
// - TURNSTILE_SECRET_KEY unset → fail-open (skip verification, log once at
//   warn level). This keeps local dev / preview environments unblocked while
//   still surfacing missing config in production logs.
// - Token missing or empty → 403 with `outcome: turnstile_failed`.
// - siteverify success: false → 403 with `outcome: turnstile_failed`.
// - siteverify network failure → 403 with `outcome: turnstile_failed` (fail-
//   closed; if Cloudflare can't verify, treat as untrusted).
//
// Placement: applied to /api/pack only — docs pages, health checks, and any
// future public read-only endpoints stay challenge-free so SEO/LLMO crawlers
// (Googlebot, GPTBot, etc.) are unaffected.
export function turnstileMiddleware(deps: TurnstileDeps = defaultDeps) {
  let secretMissingLogged = false;

  return async function turnstileMiddleware(c: Context, next: Next) {
    const secret = deps.getSecret();
    if (!secret) {
      if (!secretMissingLogged) {
        secretMissingLogged = true;
        logWarning('TURNSTILE_SECRET_KEY not set — Turnstile verification skipped');
      }
      await next();
      return;
    }

    const requestId = c.get('requestId');
    const clientInfo = getClientInfo(c);
    const cf = buildCfLogField(clientInfo);
    const token = c.req.header(TOKEN_HEADER);

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

    await next();
  };
}
