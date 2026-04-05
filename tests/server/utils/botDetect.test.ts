import { describe, expect, test, vi } from 'vitest';
import { isBot } from '../../../website/client/utils/botDetect.js';

describe('isBot', () => {
  test('should detect Applebot', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Applebot/0.1; +http://www.apple.com/go/applebot)' });
    expect(isBot()).toBe(true);
    vi.unstubAllGlobals();
  });

  test('should detect Googlebot', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    });
    expect(isBot()).toBe(true);
    vi.unstubAllGlobals();
  });

  test('should detect generic bot in UA', () => {
    vi.stubGlobal('navigator', { userAgent: 'SomeBot/1.0 (crawler)' });
    expect(isBot()).toBe(true);
    vi.unstubAllGlobals();
  });

  test('should not flag normal Chrome browser', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    expect(isBot()).toBe(false);
    vi.unstubAllGlobals();
  });

  test('should not flag Safari browser', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    });
    expect(isBot()).toBe(false);
    vi.unstubAllGlobals();
  });

  test('should return false when navigator is undefined (SSR)', () => {
    const originalNavigator = globalThis.navigator;
    // @ts-expect-error -- Simulate SSR environment
    delete globalThis.navigator;
    expect(isBot()).toBe(false);
    globalThis.navigator = originalNavigator;
  });
});
