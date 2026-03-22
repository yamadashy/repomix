import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

// Mock gpt-tokenizer encoding modules
const mockCountTokens = vi.fn();

vi.mock('gpt-tokenizer/encoding/o200k_base', () => ({
  countTokens: (...args: unknown[]) => mockCountTokens(...args),
}));

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(async () => {
    mockCountTokens.mockReset();
    tokenCounter = await TokenCounter.create('o200k_base');
  });

  afterEach(() => {
    tokenCounter.free();
    vi.resetAllMocks();
  });

  test('should correctly count tokens for simple text', () => {
    const text = 'Hello, world!';
    mockCountTokens.mockReturnValue(3);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(3);
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
    expect(mockCountTokens).toHaveBeenCalledWith(text);
  });

  test('should handle special characters', () => {
    const text = '!@#$%^&*()_+';
    mockCountTokens.mockReturnValue(3);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(3);
    expect(mockCountTokens).toHaveBeenCalledWith(text);
  });

  test('should handle unicode characters', () => {
    const text = '你好，世界！🌍';
    mockCountTokens.mockReturnValue(4);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(4);
    expect(mockCountTokens).toHaveBeenCalledWith(text);
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
    expect(mockCountTokens).toHaveBeenCalledWith(text);
  });

  test('should handle very long text', () => {
    const text = 'a'.repeat(10000);
    mockCountTokens.mockReturnValue(100);

    const count = tokenCounter.countTokens(text);

    expect(count).toBe(100);
    expect(mockCountTokens).toHaveBeenCalledWith(text);
  });

  test('should properly handle encoding errors without file path', () => {
    mockCountTokens.mockImplementation(() => {
      throw new Error('Encoding error');
    });

    const count = tokenCounter.countTokens('test content');

    expect(count).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('Failed to count tokens. error: Encoding error');
  });

  test('should properly handle encoding errors with file path', () => {
    mockCountTokens.mockImplementation(() => {
      throw new Error('Encoding error');
    });

    const count = tokenCounter.countTokens('test content', 'test.txt');

    expect(count).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith('Failed to count tokens. path: test.txt, error: Encoding error');
  });

  test('should handle free() as no-op', () => {
    // gpt-tokenizer is pure JS, free() should be a no-op
    expect(() => tokenCounter.free()).not.toThrow();
  });
});
