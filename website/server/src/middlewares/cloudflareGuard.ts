import { timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';
import { getClientInfo } from '../utils/clientInfo.js';
import { logWarning } from '../utils/logger.js';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
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
