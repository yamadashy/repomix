import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
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

  it('should use larger batches for more than 100 files', async () => {
    // Generate 150 files to trigger the large batch path (>100 files → batch size 50)
    const fileCount = 150;
    const processedFiles: ProcessedFile[] = Array.from({ length: fileCount }, (_, i) => ({
      path: `file${i}.txt`,
      content: 'test',
    }));
    const targetFilePaths = processedFiles.map((f) => f.path);

    let batchCount = 0;
    const taskRunner: MetricsTaskRunner = {
      run: async (task: MetricsWorkerTask) => {
        batchCount++;
        if ('items' in task) {
          const batchTask = task as TokenCountBatchTask;
          return batchTask.items.map(() => 1);
        }
        return 1;
      },
      cleanup: async () => {},
    };

    const result = await calculateSelectiveFileMetrics(processedFiles, targetFilePaths, 'o200k_base', vi.fn(), {
      taskRunner,
    });

    expect(result).toHaveLength(fileCount);
    // With batch size 50 for >100 files: ceil(150/50) = 3 batches
    expect(batchCount).toBe(3);
  });

  it('should use smaller batches for 100 or fewer files', async () => {
    const fileCount = 100;
    const processedFiles: ProcessedFile[] = Array.from({ length: fileCount }, (_, i) => ({
      path: `file${i}.txt`,
      content: 'test',
    }));
    const targetFilePaths = processedFiles.map((f) => f.path);

    let batchCount = 0;
    const taskRunner: MetricsTaskRunner = {
      run: async (task: MetricsWorkerTask) => {
        batchCount++;
        if ('items' in task) {
          const batchTask = task as TokenCountBatchTask;
          return batchTask.items.map(() => 1);
        }
        return 1;
      },
      cleanup: async () => {},
    };

    const result = await calculateSelectiveFileMetrics(processedFiles, targetFilePaths, 'o200k_base', vi.fn(), {
      taskRunner,
    });

    expect(result).toHaveLength(fileCount);
    // With batch size 10 for <=100 files: ceil(100/10) = 10 batches
    expect(batchCount).toBe(10);
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
});
