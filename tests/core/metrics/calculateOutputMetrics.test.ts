import { describe, expect, it, vi } from 'vitest';
import { calculateOutputMetrics } from '../../../src/core/metrics/calculateOutputMetrics.js';
import type { OutputMetricsTask } from '../../../src/core/metrics/workers/outputMetricsWorker.js';
import outputMetricsWorker from '../../../src/core/metrics/workers/outputMetricsWorker.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

const mockInitTaskRunner = () => {
  return async (task: OutputMetricsTask) => {
    return await outputMetricsWorker(task);
  };
};

describe('calculateOutputMetrics', () => {
  it('should calculate metrics for output content', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const path = 'test.txt';

    const result = await calculateOutputMetrics(content, encoding, path, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toBe(2); // 'test content' should be counted as 2 tokens
  });

  it('should work without a specified path', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toBe(2);
  });

  it('should handle errors from worker', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const mockError = new Error('Worker error');

    const mockErrorTaskRunner = () => {
      return async () => {
        throw mockError;
      };
    };

    await expect(
      calculateOutputMetrics(content, encoding, undefined, {
        initTaskRunner: mockErrorTaskRunner,
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during token count:', mockError);
  });

  it('should handle empty content', async () => {
    const content = '';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toBe(0);
  });

  it('should work with longer complex content', async () => {
    const content = 'This is a longer test content with multiple sentences. It should work correctly.';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });
});
