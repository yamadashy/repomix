import { describe, expect, it, vi } from 'vitest';
import { calculateOutputMetrics } from '../../../src/core/metrics/calculateOutputMetrics.js';
import type { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

const createMockTokenCounter = (countFn?: (...args: unknown[]) => number): TokenCounter => {
  return {
    countTokens: countFn ?? vi.fn().mockReturnValue(2),
    free: vi.fn(),
  } as unknown as TokenCounter;
};

describe('calculateOutputMetrics', () => {
  it('should calculate metrics for output content', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const path = 'test.txt';

    const countFn = vi.fn().mockReturnValue(2);
    const tokenCounter = createMockTokenCounter(countFn);

    const result = await calculateOutputMetrics(content, encoding, path, { tokenCounter });

    expect(result).toBe(2);
    expect(countFn).toHaveBeenCalledWith(content, path);
  });

  it('should work without a specified path', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';

    const countFn = vi.fn().mockReturnValue(2);
    const tokenCounter = createMockTokenCounter(countFn);

    const result = await calculateOutputMetrics(content, encoding, undefined, { tokenCounter });

    expect(result).toBe(2);
    expect(countFn).toHaveBeenCalledWith(content, undefined);
  });

  it('should handle errors from token counter', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const mockError = new Error('Counter error');

    const tokenCounter = createMockTokenCounter(() => {
      throw mockError;
    });

    await expect(calculateOutputMetrics(content, encoding, undefined, { tokenCounter })).rejects.toThrow(
      'Counter error',
    );

    expect(logger.error).toHaveBeenCalledWith('Error during token count:', mockError);
  });

  it('should handle empty content', async () => {
    const content = '';
    const encoding = 'o200k_base';

    const tokenCounter = createMockTokenCounter(() => 0);

    const result = await calculateOutputMetrics(content, encoding, undefined, { tokenCounter });

    expect(result).toBe(0);
  });

  it('should work with longer complex content', async () => {
    const content = 'This is a longer test content with multiple sentences. It should work correctly.';
    const encoding = 'o200k_base';

    const tokenCounter = createMockTokenCounter(() => 15);

    const result = await calculateOutputMetrics(content, encoding, undefined, { tokenCounter });

    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('should call countTokens with content and path', async () => {
    const content = 'a'.repeat(1_100_000);
    const encoding = 'o200k_base';
    const path = 'large-file.txt';

    const countFn = vi.fn().mockReturnValue(100);
    const tokenCounter = createMockTokenCounter(countFn);

    const result = await calculateOutputMetrics(content, encoding, path, { tokenCounter });

    expect(countFn).toHaveBeenCalledTimes(1);
    expect(countFn).toHaveBeenCalledWith(content, path);
    expect(result).toBe(100);
  });

  it('should handle errors and rethrow', async () => {
    const content = 'a'.repeat(1_100_000);
    const encoding = 'o200k_base';
    const mockError = new Error('Processing error');

    const tokenCounter = createMockTokenCounter(() => {
      throw mockError;
    });

    await expect(calculateOutputMetrics(content, encoding, undefined, { tokenCounter })).rejects.toThrow(
      'Processing error',
    );

    expect(logger.error).toHaveBeenCalledWith('Error during token count:', mockError);
  });

  it('should return the token count from tokenCounter', async () => {
    const content = 'a'.repeat(1_100_000);
    const encoding = 'o200k_base';

    const countFn = vi.fn().mockReturnValue(5000);
    const tokenCounter = createMockTokenCounter(countFn);

    const result = await calculateOutputMetrics(content, encoding, undefined, { tokenCounter });

    expect(countFn).toHaveBeenCalledTimes(1);
    expect(result).toBe(5000);
  });
});
