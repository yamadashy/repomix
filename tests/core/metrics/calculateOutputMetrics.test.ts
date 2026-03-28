import { describe, expect, it, vi } from 'vitest';
import { calculateOutputMetrics } from '../../../src/core/metrics/calculateOutputMetrics.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('calculateOutputMetrics', () => {
  const mockGetTokenCounter = async () => {
    const counter = new TokenCounter('o200k_base');
    await counter.init();
    return counter;
  };

  it('should calculate metrics for output content', async () => {
    const content = 'test content';
    const encoding = 'o200k_base' as const;
    const path = 'test.txt';

    const result = await calculateOutputMetrics(content, encoding, path, {
      getTokenCounter: mockGetTokenCounter,
    });

    expect(result).toBe(2); // 'test content' should be counted as 2 tokens
  });

  it('should work without a specified path', async () => {
    const content = 'test content';
    const encoding = 'o200k_base' as const;

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      getTokenCounter: mockGetTokenCounter,
    });

    expect(result).toBe(2);
  });

  it('should handle errors from token counter', async () => {
    const content = 'test content';
    const encoding = 'o200k_base' as const;
    const mockError = new Error('Token counter error');

    const mockErrorGetTokenCounter = async () => {
      throw mockError;
    };

    await expect(
      calculateOutputMetrics(content, encoding, undefined, {
        getTokenCounter: mockErrorGetTokenCounter,
      }),
    ).rejects.toThrow('Token counter error');

    expect(logger.error).toHaveBeenCalledWith('Error during token count:', mockError);
  });

  it('should handle empty content', async () => {
    const content = '';
    const encoding = 'o200k_base' as const;

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      getTokenCounter: mockGetTokenCounter,
    });

    expect(result).toBe(0);
  });

  it('should work with longer complex content', async () => {
    const content = 'This is a longer test content with multiple sentences. It should work correctly.';
    const encoding = 'o200k_base' as const;

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      getTokenCounter: mockGetTokenCounter,
    });

    expect(result).toBe(15);
  });
});
