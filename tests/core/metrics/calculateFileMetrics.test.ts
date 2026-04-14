import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateFileMetrics } from '../../../src/core/metrics/calculateFileMetrics.js';
import type { MetricsTaskRunner } from '../../../src/core/metrics/metricsWorkerRunner.js';
import {
  countTokens,
  type MetricsWorkerTask,
  type TokenCountBatchTask,
  type TokenCountTask,
} from '../../../src/core/metrics/workers/calculateMetricsWorker.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('../../shared/processConcurrency', () => ({
  getProcessConcurrency: () => 1,
}));

const mockInitTaskRunner = (_options: WorkerOptions): MetricsTaskRunner => {
  return {
    run: async (task: MetricsWorkerTask) => {
      if ('items' in task) {
        const batchTask = task as TokenCountBatchTask;
        return Promise.all(
          batchTask.items.map((item) =>
            countTokens({ content: item.content, encoding: batchTask.encoding, path: item.path }),
          ),
        );
      }
      return countTokens(task as TokenCountTask);
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('calculateFileMetrics', () => {
  it('should calculate metrics for large files via worker BPE tokenization', async () => {
    // Files above the small-file threshold (2048 bytes) are sent to workers
    const processedFiles: ProcessedFile[] = [
      { path: 'large1.txt', content: 'a'.repeat(3000) },
      { path: 'large2.txt', content: 'b'.repeat(4000) },
      { path: 'large3.txt', content: 'c'.repeat(5000) },
    ];
    const targetFilePaths = ['large1.txt', 'large3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ path: 'large1.txt', charCount: 3000, tokenCount: expect.any(Number) });
    expect(result[1]).toEqual({ path: 'large3.txt', charCount: 5000, tokenCount: expect.any(Number) });
    // BPE token counts should be reasonable (not char-based estimates)
    expect(result[0].tokenCount).toBeGreaterThan(0);
    expect(result[0].tokenCount).toBeLessThan(3000);
    expect(result[1].tokenCount).toBeGreaterThan(0);
    expect(result[1].tokenCount).toBeLessThan(5000);
  });

  it('should estimate metrics for small files without worker IPC', async () => {
    // Files at or below the small-file threshold (2048 characters) are estimated
    const processedFiles: ProcessedFile[] = [
      { path: 'small1.txt', content: 'a'.repeat(100) },
      { path: 'small2.txt', content: 'b'.repeat(500) },
      { path: 'small3.txt', content: 'c'.repeat(2048) },
    ];
    const targetFilePaths = ['small1.txt', 'small2.txt', 'small3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toHaveLength(3);
    // Estimates use Math.ceil(charCount / 3.5) for o200k_base
    expect(result[0]).toEqual({ path: 'small1.txt', charCount: 100, tokenCount: Math.ceil(100 / 3.5) });
    expect(result[1]).toEqual({ path: 'small2.txt', charCount: 500, tokenCount: Math.ceil(500 / 3.5) });
    expect(result[2]).toEqual({ path: 'small3.txt', charCount: 2048, tokenCount: Math.ceil(2048 / 3.5) });
  });

  it('should use encoding-specific chars/token ratio for estimates', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'small.txt', content: 'a'.repeat(100) }];
    const targetFilePaths = ['small.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    // p50k_base uses 3.2 chars/token
    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'p50k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result[0]).toEqual({ path: 'small.txt', charCount: 100, tokenCount: Math.ceil(100 / 3.2) });
  });

  it('should handle empty files correctly', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'empty.txt', content: '' }];
    const targetFilePaths = ['empty.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result[0]).toEqual({ path: 'empty.txt', charCount: 0, tokenCount: 0 });
  });

  it('should handle mixed small and large files', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'small.txt', content: 'a'.repeat(100) },
      { path: 'large.txt', content: 'b'.repeat(5000) },
    ];
    const targetFilePaths = ['small.txt', 'large.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toHaveLength(2);
    // Small file gets estimate (o200k_base uses 3.5 chars/token)
    expect(result[0]).toEqual({ path: 'small.txt', charCount: 100, tokenCount: Math.ceil(100 / 3.5) });
    // Large file gets BPE count
    expect(result[1].path).toBe('large.txt');
    expect(result[1].charCount).toBe(5000);
    expect(result[1].tokenCount).toBeGreaterThan(0);
    expect(result[1].tokenCount).toBeLessThan(5000);
  });

  it('should return empty array when no target files match', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'a'.repeat(100) }];
    const targetFilePaths = ['nonexistent.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toEqual([]);
  });
});
