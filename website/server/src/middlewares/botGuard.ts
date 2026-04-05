import type { Context, Next } from 'hono';
import { isbot } from 'isbot';
import { getClientInfo } from '../utils/clientInfo.js';
import { createErrorResponse } from '../utils/http.js';
import { logWarning } from '../utils/logger.js';

let lastBotBlockLogAt = 0;
const LOG_INTERVAL_MS = 60_000;

export function botGuardMiddleware() {
  return async function botGuardMiddleware(c: Context, next: Next) {
    const clientInfo = getClientInfo(c);
    const requestId = c.get('requestId');

    if (isbot(clientInfo.userAgent)) {
      // Throttle logging to avoid log storms from heavy bot traffic
      const now = Date.now();
      if (now - lastBotBlockLogAt >= LOG_INTERVAL_MS) {
        lastBotBlockLogAt = now;
        logWarning('Bot request blocked', {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          referer: clientInfo.referer,
        });
      }

      return c.json(createErrorResponse('Automated requests are not allowed.', requestId), 403);
    }

    await next();
  };
}
