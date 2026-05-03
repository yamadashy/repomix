import { Hono } from 'hono';
import { describe, expect, test, vi } from 'vitest';
import { turnstileMiddleware } from '../src/middlewares/turnstile.js';

// The middleware reads `requestId` and `clientInfo` from the Hono context
// (set by upstream middleware in production). For unit tests we shim these
// via a tiny middleware so each test gets the values it needs without
// importing the full middleware chain.
function buildApp(opts: { middleware: ReturnType<typeof turnstileMiddleware>; requestId?: string }) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('requestId', opts.requestId ?? 'req-test');
    await next();
  });
  app.post('/api/pack', opts.middleware, (c) => c.json({ ok: true }));
  return app;
}

const SECRET = 'test-secret';

describe('turnstileMiddleware', () => {
  test('skips verification when secret is unset (fail-open)', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => undefined,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns 403 when token header is missing', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', { method: 'POST' });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Verification failed/);
  });

  test('passes through when siteverify reports success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'good-token' },
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = (init as RequestInit).body as URLSearchParams;
    expect(body.get('secret')).toBe(SECRET);
    expect(body.get('response')).toBe('good-token');
  });

  test('returns 403 when siteverify reports failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'bad-token' },
    });

    expect(res.status).toBe(403);
  });

  test('returns 403 (fail-closed) when siteverify network call rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'any-token' },
    });

    expect(res.status).toBe(403);
  });
});
