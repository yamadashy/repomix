import type { Context, Next } from 'hono';

export function cloudflareGuardMiddleware() {
  return async function cloudflareGuardMiddleware(c: Context, next: Next) {
    const secret = process.env.CLOUDFLARE_ORIGIN_SECRET;

    // Skip guard when secret is not configured (development / migration period)
    if (!secret) {
      await next();
      return;
    }

    if (c.req.header('x-origin-secret') !== secret) {
      return c.text('Forbidden', 403);
    }

    await next();
  };
}
