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
        run: async (_task: T) => {
          chunksProcessed++;
          // Return a fixed token count for each chunk
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
    expect(result).toBe(100_000); // 1000 chunks * 100 tokens per chunk
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
          processedChunks.push(outputTask.content);
          return outputTask.content.length as R;
        },
        cleanup: async () => {
          // Mock cleanup - no-op for tests
        },
      };
    };

    await calculateOutputMetrics(content, encoding, undefined, {
      taskRunner: mockChunkTrackingTaskRunner({
        numOfTasks: 1,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      }),
    });

    // Check that chunks are roughly equal in size
    const _expectedChunkSize = Math.ceil(content.length / 1000); // CHUNK_SIZE is 1000
    const chunkSizes = processedChunks.map((chunk) => chunk.length);

    expect(processedChunks.length).toBe(1000); // Should have 1000 chunks
    expect(Math.max(...chunkSizes) - Math.min(...chunkSizes)).toBeLessThanOrEqual(1); // Chunks should be almost equal in size
    expect(processedChunks.join('')).toBe(content); // All content should be processed
  });
});
