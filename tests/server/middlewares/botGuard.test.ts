import { Hono } from 'hono';
import { describe, expect, test, vi } from 'vitest';

// Mock the logger to avoid winston dependency
vi.mock('../../../website/server/src/utils/logger.js', () => ({
  logWarning: vi.fn(),
  logInfo: vi.fn(),
}));

const { botGuardMiddleware } = await import('../../../website/server/src/middlewares/botGuard.js');

function createApp() {
  const app = new Hono();

  // The botGuard middleware reads requestId from context, so set a default
  app.use('*', async (c, next) => {
    // biome-ignore lint/suspicious/noExplicitAny: test setup for Hono context variable
    (c as any).set('requestId', 'test-req-id');
    await next();
  });

  app.use('/api/*', botGuardMiddleware());
  app.post('/api/pack', (c) => c.json({ ok: true }));
  app.get('/health', (c) => c.text('OK'));

  return app;
}

describe('botGuardMiddleware', () => {
  const app = createApp();

  test('should block Applebot requests', async () => {
    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Applebot/0.1; +http://www.apple.com/go/applebot)' },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Automated requests are not allowed.');
  });

  test('should block Googlebot requests', async () => {
    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });

    expect(res.status).toBe(403);
  });

  test('should block GPTBot requests', async () => {
    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0)' },
    });

    expect(res.status).toBe(403);
  });

  test('should block ClaudeBot requests', async () => {
    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: { 'User-Agent': 'ClaudeBot/1.0' },
    });

    expect(res.status).toBe(403);
  });

  test('should allow normal browser requests', async () => {
    const res = await app.request('/api/pack', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    expect(res.status).toBe(200);
  });

  test('should allow requests without User-Agent', async () => {
    const res = await app.request('/api/pack', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
  });

  test('should not affect non-API routes', async () => {
    const res = await app.request('/health', {
      headers: { 'User-Agent': 'Applebot/0.1' },
    });

    expect(res.status).toBe(200);
  });
});
