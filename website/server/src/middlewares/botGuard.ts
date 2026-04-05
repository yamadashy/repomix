import type { Context, Next } from 'hono';
import { isbot } from 'isbot';
import { getClientInfo } from '../utils/clientInfo.js';
import { createErrorResponse } from '../utils/http.js';
import { logWarning } from '../utils/logger.js';

export function botGuardMiddleware() {
  let lastBotBlockLogAt = 0;
  let botBlockCount = 0;
  const LOG_INTERVAL_MS = 60_000;

  return async function botGuardHandler(c: Context, next: Next) {
    const clientInfo = getClientInfo(c);
    const requestId = c.get('requestId') ?? 'unknown';

    if (isbot(clientInfo.userAgent)) {
      botBlockCount++;

      // Throttle logging to avoid log storms from heavy bot traffic
      const now = Date.now();
      if (now - lastBotBlockLogAt >= LOG_INTERVAL_MS) {
        logWarning(`Blocked ${botBlockCount} bot request(s) since last log`, {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          referer: clientInfo.referer,
        });
        lastBotBlockLogAt = now;
        botBlockCount = 0;
      }

      return c.json(createErrorResponse('Automated requests are not allowed.', requestId), 403);
    }

    await next();
  };
}
