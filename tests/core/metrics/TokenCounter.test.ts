import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

const mockEncode = vi.fn();

vi.mock('../../../src/core/metrics/tokenEncoding', () => ({
  loadTokenEncoding: vi.fn(() => ({
    encode: mockEncode,
  })),
}));

vi.mock('../../../src/shared/logger');

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    // Setup mock encoder behavior
    mockEncode.mockReturnValue([]);

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
    const mockTokens = [123, 456, 789]; // Example token IDs
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(3); // Length of mockTokens
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle empty string', () => {
    mockEncode.mockReturnValue([]);

    const count = tokenCounter.countTokens('');

    expect(count).toBe(0);
    expect(mockEncode).toHaveBeenCalledWith('', { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle multi-line text', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const mockTokens = [1, 2, 3, 4, 5, 6];
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(6);
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle special characters', () => {
    const text = '!@#$%^&*()_+';
    const mockTokens = [1, 2, 3];
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(3);
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle unicode characters', () => {
    const text = '你好，世界！🌍';
    const mockTokens = [1, 2, 3, 4];
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(4);
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle code snippets', () => {
    const text = `
      function hello() {
        console.log("Hello, world!");
      }
    `;
    const mockTokens = Array(10).fill(1); // 10 tokens
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(10);
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle markdown text', () => {
    const text = `
      # Heading
      ## Subheading
      * List item 1
      * List item 2

      **Bold text** and _italic text_
    `;
    const mockTokens = Array(15).fill(1); // 15 tokens
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(15);
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should handle very long text', () => {
    const text = 'a'.repeat(10000);
    const mockTokens = Array(100).fill(1); // 100 tokens
    mockEncode.mockReturnValue(mockTokens);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(100);
    expect(mockEncode).toHaveBeenCalledWith(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() });
  });

  test('should properly handle encoding errors without file path', () => {
    const error = new Error('Encoding error');
    mockEncode.mockImplementation(() => {
      throw error;
    });

    const count = tokenCounter.countTokens('test content');

    expect(count).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('Failed to count tokens. error: Encoding error');
  });

  test('should properly handle encoding errors with file path', () => {
    const error = new Error('Encoding error');
    mockEncode.mockImplementation(() => {
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
