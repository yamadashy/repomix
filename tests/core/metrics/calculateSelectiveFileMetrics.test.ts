import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import { getTokenCounter } from '../../../src/core/metrics/tokenCounterFactory.js';
import type { TokenCountBatchTask } from '../../../src/core/metrics/workers/calculateMetricsWorker.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('../../shared/processConcurrency', () => ({
  getProcessConcurrency: () => 1,
}));

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      const batchTask = task as TokenCountBatchTask;
      const results: number[] = [];
      for (const item of batchTask.items) {
        const counter = await getTokenCounter(item.encoding);
        results.push(counter.countTokens(item.content, item.path));
      }
      return results as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('calculateSelectiveFileMetrics', () => {
  it('should calculate metrics for selective files only', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
      { path: 'file3.txt', content: 'c'.repeat(300) },
    ];
    const targetFilePaths = ['file1.txt', 'file3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
      },
    );

    expect(result).toEqual([
      { path: 'file1.txt', charCount: 100, tokenCount: 13 },
      { path: 'file3.txt', charCount: 300, tokenCount: 75 },
    ]);
  });

  it('should return empty array when no target files match', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'a'.repeat(100) }];
    const targetFilePaths = ['nonexistent.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
      },
    );

    expect(result).toEqual([]);
  });

  it('should process files in multiple batches when exceeding batch size', async () => {
    const fileCount = 60;
    const processedFiles: ProcessedFile[] = Array.from({ length: fileCount }, (_, i) => ({
      path: `file${i}.txt`,
      content: 'a'.repeat(10),
    }));
    const targetFilePaths = processedFiles.map((f) => f.path);
    const progressCallback: RepomixProgressCallback = vi.fn();

    let batchCount = 0;
    const batchTrackingRunner = {
      run: async (task: TokenCountBatchTask) => {
        batchCount++;
        const results: number[] = [];
        for (const item of task.items) {
          const counter = await getTokenCounter(item.encoding);
          results.push(counter.countTokens(item.content, item.path));
        }
        return results;
      },
      cleanup: async () => {},
    };

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      { taskRunner: batchTrackingRunner },
    );

    // 60 files with BATCH_SIZE=50 should produce 2 batches
    expect(batchCount).toBe(2);
    expect(result).toHaveLength(fileCount);
  });
});
