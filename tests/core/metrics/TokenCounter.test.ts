import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(async () => {
    tokenCounter = new TokenCounter('o200k_base');
    await tokenCounter.init();
  });

  afterEach(() => {
    tokenCounter.free();
    vi.resetAllMocks();
  });

  test('should correctly count tokens for simple text', () => {
    const count = tokenCounter.countTokens('Hello, world!');
    expect(count).toBe(4);
  });

  test('should handle empty string', () => {
    const count = tokenCounter.countTokens('');
    expect(count).toBe(0);
  });

  test('should handle multi-line text', () => {
    const count = tokenCounter.countTokens('Line 1\nLine 2\nLine 3');
    expect(count).toBe(11);
  });

  test('should handle special characters', () => {
    const count = tokenCounter.countTokens('!@#$%^&*()_+');
    expect(count).toBe(9);
  });

  test('should handle unicode characters', () => {
    const count = tokenCounter.countTokens('你好，世界！🌍');
    expect(count).toBe(6);
  });

  test('should handle code snippets', () => {
    const text = `
      function hello() {
        console.log("Hello, world!");
      }
    `;
    const count = tokenCounter.countTokens(text);
    expect(count).toBe(17);
  });

  test('should handle markdown text', () => {
    const text = `
      # Heading
      ## Subheading
      * List item 1
      * List item 2

      **Bold text** and _italic text_
    `;
    const count = tokenCounter.countTokens(text);
    expect(count).toBe(35);
  });

  test('should handle very long text', () => {
    const text = 'a'.repeat(10000);
    const count = tokenCounter.countTokens(text);
    expect(count).toBe(1250);
  });

  test('should handle special token sequences as plain text', () => {
    // gpt-tokenizer should treat <|endoftext|> as ordinary text, not a control token
    const count = tokenCounter.countTokens('Hello <|endoftext|> world');
    expect(count).toBeGreaterThan(0);
  });

  test('should work with cl100k_base encoding', async () => {
    const cl100kCounter = new TokenCounter('cl100k_base');
    await cl100kCounter.init();

    const count = cl100kCounter.countTokens('Hello, world!');
    expect(count).toBe(4);

    cl100kCounter.free();
  });

  test('should throw when countTokens is called before init', () => {
    const uninitCounter = new TokenCounter('o200k_base');
    expect(() => uninitCounter.countTokens('test')).toThrow('TokenCounter not initialized');
  });

  test('should free without error (no-op for gpt-tokenizer)', () => {
    expect(() => tokenCounter.free()).not.toThrow();
  });

  describe('countTokens error handling', () => {
    // Inject a fake loadEncoding via the deps parameter so tests own the
    // count function without reaching into private state. This keeps the
    // tests honest if `countFn` is ever renamed.
    const buildCounter = async (countFn: (text: string) => number) => {
      const counter = new TokenCounter('o200k_base', {
        loadEncoding: async () => countFn,
      });
      await counter.init();
      return counter;
    };

    test('returns 0 and warns when tokenizer throws an Error', async () => {
      const counter = await buildCounter(() => {
        throw new Error('tokenizer exploded');
      });

      const count = counter.countTokens('content');

      expect(count).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('tokenizer exploded'));
    });

    test('includes filePath in the warning when provided', async () => {
      const counter = await buildCounter(() => {
        throw new Error('boom');
      });

      counter.countTokens('content', 'src/foo.ts');

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('path: src/foo.ts'));
    });

    test('coerces non-Error throws via String()', async () => {
      const counter = await buildCounter(() => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'plain string error';
      });

      const count = counter.countTokens('content');

      expect(count).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('plain string error'));
    });
  });
});
