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

const okResponse = (body: object) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });

describe('turnstileMiddleware', () => {
  test('skips verification when secret is unset (fail-open in dev/test)', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => undefined,
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns 403 when secret is unset in production (fail-closed)', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => undefined,
      isProduction: () => true,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', { method: 'POST' });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns 403 when token header is missing', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', { method: 'POST' });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Verification failed/);
  });

  test('returns 403 when token is whitespace-only (treated as missing)', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': '   ' },
    });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns 403 when token exceeds max length (no siteverify call)', async () => {
    const fetchMock = vi.fn();
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const oversized = 'x'.repeat(2049);
    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': oversized },
    });

    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('passes through when siteverify reports success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, action: 'pack' }));
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
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

  test('passes through when siteverify omits action (backward-compat)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true }));
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'good-token' },
    });

    expect(res.status).toBe(200);
  });

  test('returns 403 when siteverify reports an action other than "pack"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true, action: 'login' }));
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'wrong-action-token' },
    });

    expect(res.status).toBe(403);
  });

  test('returns 403 when siteverify reports failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okResponse({ success: false, 'error-codes': ['invalid-input-response'] }));
    const middleware = turnstileMiddleware({
      fetch: fetchMock,
      getSecret: () => SECRET,
      isProduction: () => false,
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
      isProduction: () => false,
    });
    const app = buildApp({ middleware });

    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'any-token' },
    });

    expect(res.status).toBe(403);
  });
});
