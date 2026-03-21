import { timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getClientInfo } from '../utils/clientInfo.js';
import { logWarning } from '../utils/logger.js';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function cloudflareGuardMiddleware() {
  return async function cloudflareGuardMiddleware(c: Context, next: Next) {
    const secret = process.env.CLOUDFLARE_ORIGIN_SECRET;

    // Skip guard when secret is not configured (development / migration period)
    if (!secret) {
      await next();
      return;
    }

    const header = c.req.header('x-origin-secret') ?? '';
    if (!safeCompare(header, secret)) {
      const { ip } = getClientInfo(c);
      logWarning('Cloudflare origin guard blocked request', {
        ip,
        path: c.req.path,
      });
      return c.text('Forbidden', 403);
    }

    await next();
  };
}
