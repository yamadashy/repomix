import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import {
  countTokens,
  countTokensBatch,
  type TokenCountBatchTask,
  type TokenCountTask,
} from '../../../src/core/metrics/workers/calculateMetricsWorker.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('../../shared/processConcurrency', () => ({
  getProcessConcurrency: () => 1,
}));

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      // Handle both single and batch tasks, mirroring the real worker's dispatch
      if (task && typeof task === 'object' && 'batch' in task) {
        return (await countTokensBatch(task as unknown as TokenCountBatchTask)) as R;
      }
      return (await countTokens(task as TokenCountTask)) as R;
    },
    cleanup: async () => {},
    unref: () => {
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

  it('should use batching and produce correct results for many files', async () => {
    // Create 60 files to exercise the batching path
    const processedFiles: ProcessedFile[] = Array.from({ length: 60 }, (_, i) => ({
      path: `file${i}.txt`,
      content: `content-${i}-${'x'.repeat(50)}`,
    }));
    const targetFilePaths = processedFiles.map((f) => f.path);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        taskRunner: mockInitTaskRunner({ numOfTasks: 60, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
      },
    );

    // Should return results for all 60 files
    expect(result).toHaveLength(60);

    // Verify order is preserved
    for (let i = 0; i < 60; i++) {
      expect(result[i].path).toBe(`file${i}.txt`);
      expect(result[i].charCount).toBe(processedFiles[i].content.length);
      expect(result[i].tokenCount).toBeGreaterThan(0);
    }

    // Verify progress was called (batch-level progress)
    expect(progressCallback).toHaveBeenCalled();
  });

  it('should produce identical results whether batched or individual', async () => {
    const processedFiles: ProcessedFile[] = Array.from({ length: 55 }, (_, i) => ({
      path: `src/module${i}.ts`,
      content: `export const value${i} = ${i};\n`.repeat(10),
    }));
    const targetFilePaths = processedFiles.map((f) => f.path);
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Get batched results
    const batchedResult = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        taskRunner: mockInitTaskRunner({ numOfTasks: 55, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
      },
    );

    // Get individual results for comparison (use countTokens directly)
    const individualResults = await Promise.all(
      processedFiles.map(async (file) => ({
        path: file.path,
        charCount: file.content.length,
        tokenCount: await countTokens({ content: file.content, encoding: 'o200k_base', path: file.path }),
      })),
    );

    // Results should be identical
    expect(batchedResult).toEqual(individualResults);
  });
});
