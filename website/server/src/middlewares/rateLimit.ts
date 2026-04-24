import type { Context, Next } from 'hono';
import { PACK_EVENT, type PackOutcome } from '../actions/packEventSchema.js';
import { rateLimiter } from '../domains/pack/utils/sharedInstance.js';
import { getClientInfo } from '../utils/clientInfo.js';
import { dailyRateLimiter } from '../utils/dailyRateLimit.js';
import { createErrorResponse } from '../utils/http.js';
import { buildCfLogField, logInfo, logWarning } from '../utils/logger.js';

let lastDailyRateLimitErrorLogAt = 0;
const ERROR_LOG_INTERVAL_MS = 60_000;

export function rateLimitMiddleware() {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    const clientInfo = getClientInfo(c);
    const requestId = c.get('requestId');
    // Cloudflare metadata is most valuable on rate-limit hits — bots are the
    // primary population that hits the limit, so country/ASN is exactly what
    // we want for triage.
    const cf = buildCfLogField(clientInfo);

    // Check short-term rate limit first (in-memory, saves Upstash commands for burst traffic)
    if (!rateLimiter.isAllowed(clientInfo.ip)) {
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime(clientInfo.ip) / 1000);
      const message = `Rate limit exceeded.\nPlease try again in ${remainingTime} seconds.`;
      logInfo('Pack request rate limited', {
        event: PACK_EVENT,
        outcome: 'rate_limited' satisfies PackOutcome,
        limitKind: 'short_term',
        requestId,
        source: clientInfo.source,
        ...(cf && { cf }),
      });
      return c.json(createErrorResponse(message, requestId), 429);
    }

    // Check daily rate limit (Upstash)
    if (dailyRateLimiter) {
      try {
        const { success, reset } = await dailyRateLimiter.limit(clientInfo.ip);
        if (!success) {
          const remainingMs = Math.max(0, reset - Date.now());
          const hours = Math.max(1, Math.ceil(remainingMs / 3_600_000));
          const message = `Daily pack limit reached.\nPlease try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
          logInfo('Pack request rate limited', {
            event: PACK_EVENT,
            outcome: 'rate_limited' satisfies PackOutcome,
            limitKind: 'daily',
            requestId,
            source: clientInfo.source,
            ...(cf && { cf }),
          });
          return c.json(createErrorResponse(message, requestId), 429);
        }
      } catch (error) {
        // Fail open: if Upstash is unavailable, allow the request
        // Throttle logging to avoid log storms during outages
        const now = Date.now();
        if (now - lastDailyRateLimitErrorLogAt >= ERROR_LOG_INTERVAL_MS) {
          lastDailyRateLimitErrorLogAt = now;
          logWarning('Daily rate limit check failed, allowing request', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    await next();
  };
}
