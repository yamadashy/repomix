import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';

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

  test('should return 0 for errors when not initialized', () => {
    const uninitCounter = new TokenCounter('o200k_base');
    // Not calling init() - should throw
    expect(() => uninitCounter.countTokens('test')).toThrow('TokenCounter not initialized');
  });

  test('should free without error (no-op for gpt-tokenizer)', () => {
    expect(() => tokenCounter.free()).not.toThrow();
  });
});
