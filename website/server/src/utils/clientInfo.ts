import type { Context } from 'hono';

export type RequestSource = 'cloudflare' | 'direct';

export interface ClientInfo {
  ip: string;
  userAgent?: string;
  referer?: string;
  cfRay?: string;
  cfCountry?: string;
  cfAsn?: string;
  source: RequestSource;
}

export function getClientInfo(c: Context): ClientInfo {
  // Get client IP from various headers (prioritized order)
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    '0.0.0.0';

  const userAgent = c.req.header('user-agent');
  const referer = c.req.header('referer');

  // Cloudflare-injected headers. `cf-ray` is added on every proxied request,
  // so its presence distinguishes traffic that came through Cloudflare from
  // requests that hit Cloud Run directly (typically bots that discovered the
  // origin URL and spoofed the Host header).
  // `cf-asn` is not added by default — enable it via a Cloudflare Transform
  // Rule (`HTTP Request Header Modification`) that sets `cf-asn` from
  // `ip.src.asnum`.
  const cfRay = c.req.header('cf-ray');
  const cfCountry = c.req.header('cf-ipcountry');
  const cfAsn = c.req.header('cf-asn');
  const source: RequestSource = cfRay ? 'cloudflare' : 'direct';

  return {
    ip,
    userAgent,
    referer,
    cfRay,
    cfCountry,
    cfAsn,
    source,
  };
}
