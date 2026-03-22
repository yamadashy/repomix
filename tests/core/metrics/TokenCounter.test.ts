import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

const mockCountTokens = vi.fn();

vi.mock('../../../src/core/metrics/tokenEncoding', () => ({
  loadTokenEncoding: vi.fn(() => ({
    countTokens: mockCountTokens,
  })),
}));

vi.mock('../../../src/shared/logger');

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    // Setup mock encoder behavior
    mockCountTokens.mockReturnValue(0);

    // Create new TokenCounter instance
    tokenCounter = new TokenCounter('o200k_base');
  });

  afterEach(() => {
    tokenCounter.free();
    vi.resetAllMocks();
  });

  test('should initialize with o200k_base encoding', async () => {
    const { loadTokenEncoding } = await import('../../../src/core/metrics/tokenEncoding.js');
    expect(loadTokenEncoding).toHaveBeenCalledWith('o200k_base');
  });

  test('should correctly count tokens for simple text', () => {
    const text = 'Hello, world!';
    mockCountTokens.mockReturnValue(3);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(3);
    // Called without options first for performance (skips processSpecialTokens overhead)
    expect(mockCountTokens).toHaveBeenCalledWith(text);
  });

  test('should handle empty string', () => {
    mockCountTokens.mockReturnValue(0);

    const count = tokenCounter.countTokens('');

    expect(count).toBe(0);
    expect(mockCountTokens).toHaveBeenCalledWith('');
  });

  test('should handle multi-line text', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    mockCountTokens.mockReturnValue(6);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(6);
  });

  test('should handle special characters', () => {
    const text = '!@#$%^&*()_+';
    mockCountTokens.mockReturnValue(3);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(3);
  });

  test('should handle unicode characters', () => {
    const text = '你好，世界！🌍';
    mockCountTokens.mockReturnValue(4);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(4);
  });

  test('should handle code snippets', () => {
    const text = `
      function hello() {
        console.log("Hello, world!");
      }
    `;
    mockCountTokens.mockReturnValue(10);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(10);
  });

  test('should handle markdown text', () => {
    const text = `
      # Heading
      ## Subheading
      * List item 1
      * List item 2

      **Bold text** and _italic text_
    `;
    mockCountTokens.mockReturnValue(15);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(15);
  });

  test('should handle very long text', () => {
    const text = 'a'.repeat(10000);
    mockCountTokens.mockReturnValue(100);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(100);
  });

  test('should fall back to options-based counting when special token throws', () => {
    // First call (no options) throws "Disallowed special token"
    // Second call (with options) succeeds
    let callCount = 0;
    mockCountTokens.mockImplementation((_content: string, options?: unknown) => {
      callCount++;
      if (!options) {
        throw new Error('Disallowed special token found: <|endoftext|>');
      }
      return 7; // Fallback count
    });

    const count = tokenCounter.countTokens('<|endoftext|>');

    expect(count).toBe(7);
    expect(callCount).toBe(2);
  });

  test('should properly handle encoding errors without file path', () => {
    const error = new Error('Encoding error');
    mockCountTokens.mockImplementation(() => {
      throw error;
    });

    const count = tokenCounter.countTokens('test content');

    expect(count).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('Failed to count tokens. error: Encoding error');
  });

  test('should properly handle encoding errors with file path', () => {
    const error = new Error('Encoding error');
    mockCountTokens.mockImplementation(() => {
      throw error;
    });

    const count = tokenCounter.countTokens('test content', 'test.txt');

    expect(count).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('Failed to count tokens. path: test.txt, error: Encoding error');
  });

  test('should free encoder resources on cleanup', () => {
    // free() is a no-op for gpt-tokenizer but should not throw
    expect(() => tokenCounter.free()).not.toThrow();
  });
});
