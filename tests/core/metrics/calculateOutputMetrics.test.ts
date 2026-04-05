import { describe, expect, it, vi } from 'vitest';
import { calculateOutputMetrics } from '../../../src/core/metrics/calculateOutputMetrics.js';
import { countTokens, type TokenCountTask } from '../../../src/core/metrics/workers/calculateMetricsWorker.js';
import { logger } from '../../../src/shared/logger.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';

vi.mock('../../../src/shared/logger');

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await countTokens(task as TokenCountTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('calculateOutputMetrics', () => {
  it('should calculate metrics for output content', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const path = 'test.txt';

    const result = await calculateOutputMetrics(content, encoding, path, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toBe(2); // 'test content' should be counted as 2 tokens
  });

  it('should work without a specified path', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toBe(2);
  });

  it('should handle errors from worker', async () => {
    const content = 'test content';
    const encoding = 'o200k_base';
    const mockError = new Error('Worker error');

    const mockErrorTaskRunner = <T, _R>(_options: WorkerOptions) => {
      return {
        run: async (_task: T) => {
          throw mockError;
        },
        cleanup: async () => {
          // Mock cleanup - no-op for tests
        },
      };
    };

    await expect(
      calculateOutputMetrics(content, encoding, undefined, {
        taskRunner: mockErrorTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
      }),
    ).rejects.toThrow('Worker error');

    expect(logger.error).toHaveBeenCalledWith('Error during token count:', mockError);
  });

  it('should handle empty content', async () => {
    const content = '';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toBe(0);
  });

  it('should work with longer complex content', async () => {
    const content = 'This is a longer test content with multiple sentences. It should work correctly.';
    const encoding = 'o200k_base';

    const result = await calculateOutputMetrics(content, encoding, undefined, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('should process large content in parallel', async () => {
    // Generate a large content that exceeds MIN_CONTENT_LENGTH_FOR_PARALLEL
    const content = 'a'.repeat(1_100_000); // 1.1MB of content
    const encoding = 'o200k_base';
    const path = 'large-file.txt';

    let chunksProcessed = 0;
    const mockParallelTaskRunner = <T, R>(_options: WorkerOptions) => {
      return {
        run: async (task: T) => {
          const t = task as TokenCountTask;
          // Return inconsistent results for samples to force high CV and fallback to full tokenization
          if (t.path?.includes('-sample-')) {
            const idx = Number.parseInt(t.path.split('-sample-')[1] || '0', 10);
            return (idx % 2 === 0 ? 1 : 10000) as R;
          }
          chunksProcessed++;
          return 100 as R;
        },
        cleanup: async () => {
          // Mock cleanup - no-op for tests
        },
      };
    };

    const result = await calculateOutputMetrics(content, encoding, path, {
      taskRunner: mockParallelTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(chunksProcessed).toBeGreaterThan(1); // Should have processed multiple chunks
    expect(result).toBe(chunksProcessed * 100); // chunks * 100 tokens per chunk
  });

  it('should handle errors in parallel processing', async () => {
    const content = 'a'.repeat(1_100_000); // 1.1MB of content
    const encoding = 'o200k_base';
    const mockError = new Error('Parallel processing error');

    const mockErrorTaskRunner = <T, _R>(_options: WorkerOptions) => {
      return {
        run: async (_task: T) => {
          throw mockError;
        },
        cleanup: async () => {
          // Mock cleanup - no-op for tests
        },
      };
    };

    await expect(
      calculateOutputMetrics(content, encoding, undefined, {
        taskRunner: mockErrorTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
      }),
    ).rejects.toThrow('Parallel processing error');

    expect(logger.error).toHaveBeenCalledWith('Error during token count:', mockError);
  });

  it('should correctly split content into chunks for parallel processing', async () => {
    const content = 'a'.repeat(1_100_000); // 1.1MB of content
    const encoding = 'o200k_base';
    const processedChunks: string[] = [];

    const mockChunkTrackingTaskRunner = <T, R>(_options: WorkerOptions) => {
      return {
        run: async (task: T) => {
          const outputTask = task as TokenCountTask;
          // Force sampling fallback with inconsistent sample results
          if (outputTask.path?.includes('-sample-')) {
            const idx = Number.parseInt(outputTask.path.split('-sample-')[1] || '0', 10);
            return (idx % 2 === 0 ? 1 : 10000) as R;
          }
          processedChunks.push(outputTask.content);
          return outputTask.content.length as R;
        },
        cleanup: async () => {
          // Mock cleanup - no-op for tests
        },
      };
    };

    await calculateOutputMetrics(content, encoding, 'large-file.txt', {
      taskRunner: mockChunkTrackingTaskRunner({
        numOfTasks: 1,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      }),
    });

    // With TARGET_CHARS_PER_CHUNK=100_000, 1.1MB content should produce 11 chunks
    const chunkSizes = processedChunks.map((chunk) => chunk.length);

    expect(processedChunks.length).toBe(11);
    // All chunks except the last should be exactly TARGET_CHARS_PER_CHUNK
    for (let i = 0; i < chunkSizes.length - 1; i++) {
      expect(chunkSizes[i]).toBe(100_000);
    }
    expect(processedChunks.join('')).toBe(content); // All content should be processed
  });

  describe('sampling estimation', () => {
    it('should use sampling estimation for large content with uniform token density', async () => {
      // 600KB of uniform content (above 500KB threshold)
      const content = 'hello world '.repeat(50_000); // ~600KB
      const encoding = 'o200k_base';
      let totalRunCalls = 0;

      // Mock that returns consistent tokens-per-char ratio
      const mockTaskRunner = {
        run: async (task: TokenCountTask) => {
          totalRunCalls++;
          // ~4 chars per token, consistent ratio
          return Math.round(task.content.length / 4);
        },
        cleanup: async () => {},
      };

      const result = await calculateOutputMetrics(content, encoding, 'test.txt', {
        taskRunner: mockTaskRunner,
      });

      // Should have used sampling (10 samples), not full tokenization
      expect(totalRunCalls).toBeLessThanOrEqual(10);
      // Estimated tokens should be approximately content.length / 4
      expect(result).toBeGreaterThan(0);
      expect(Math.abs(result - content.length / 4)).toBeLessThan((content.length / 4) * 0.05);
    });

    it('should fall back to full tokenization when sampling CV is too high', async () => {
      // 1.2MB of content (above both thresholds)
      const content = 'a'.repeat(1_200_000);
      const encoding = 'o200k_base';
      let runCallCount = 0;

      // Mock that returns wildly different ratios per sample to trigger high CV
      const mockTaskRunner = {
        run: async (task: TokenCountTask) => {
          runCallCount++;
          const isSample = task.path?.includes('-sample-');
          if (isSample) {
            // Alternate between very different ratios to produce high CV
            const sampleIndex = Number.parseInt(task.path?.split('-sample-')[1] || '0', 10);
            return sampleIndex % 2 === 0 ? task.content.length / 2 : task.content.length / 10;
          }
          // Full tokenization chunks
          return Math.round(task.content.length / 4);
        },
        cleanup: async () => {},
      };

      const result = await calculateOutputMetrics(content, encoding, 'test.txt', {
        taskRunner: mockTaskRunner,
      });

      // Should have fallen back to full parallel tokenization (more than 10 calls)
      expect(runCallCount).toBeGreaterThan(10);
      expect(result).toBeGreaterThan(0);
    });

    it('should not use sampling for content below threshold', async () => {
      // 400KB (below 500KB threshold)
      const content = 'a'.repeat(400_000);
      const encoding = 'o200k_base';
      let runCallCount = 0;

      const mockTaskRunner = {
        run: async (task: TokenCountTask) => {
          runCallCount++;
          return Math.round(task.content.length / 4);
        },
        cleanup: async () => {},
      };

      await calculateOutputMetrics(content, encoding, 'test.txt', {
        taskRunner: mockTaskRunner,
      });

      // Should process directly with a single call (no sampling)
      expect(runCallCount).toBe(1);
    });
  });
});
