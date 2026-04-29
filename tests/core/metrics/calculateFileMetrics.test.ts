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
  it('should calculate metrics for target files', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
      { path: 'file3.txt', content: 'c'.repeat(300) },
    ];
    const targetFilePaths = ['file1.txt', 'file3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toEqual([
      { path: 'file1.txt', charCount: 100, tokenCount: 13 },
      { path: 'file3.txt', charCount: 300, tokenCount: 75 },
    ]);
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

  // Guards the batching path: files spanning multiple batches must still
  // produce correctly-ordered, complete results, and the progress callback
  // must fire once per batch (not per file, not just once at the end).
  it('preserves order and reports progress across multiple batches', async () => {
    const fileCount = 120; // forces multiple batches at any plausible METRICS_BATCH_SIZE (≤120)
    const processedFiles: ProcessedFile[] = Array.from({ length: fileCount }, (_, i) => ({
      path: `file${i}.txt`,
      content: 'x'.repeat(i + 1),
    }));
    const targetFilePaths = processedFiles.map((f) => f.path);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const taskRunner = mockInitTaskRunner({
      numOfTasks: fileCount,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });
    const runSpy = vi.spyOn(taskRunner, 'run');

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner,
    });

    expect(result).toHaveLength(fileCount);
    expect(result.map((r) => r.path)).toEqual(targetFilePaths);
    for (const r of result) {
      expect(r.charCount).toBeGreaterThan(0);
      expect(r.tokenCount).toBeGreaterThan(0);
    }

    // Multiple batches → multiple taskRunner.run calls and progress callbacks
    expect(runSpy.mock.calls.length).toBeGreaterThan(1);
    expect(progressCallback).toHaveBeenCalledTimes(runSpy.mock.calls.length);
  });
});
