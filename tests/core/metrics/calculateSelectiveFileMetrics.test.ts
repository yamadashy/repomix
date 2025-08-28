import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import type { FileMetricsTask } from '../../../src/core/metrics/workers/fileMetricsWorker.js';
import fileMetricsWorker from '../../../src/core/metrics/workers/fileMetricsWorker.js';
import type { WorkerRuntime } from '../../../src/shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('../../shared/processConcurrency', () => ({
  getProcessConcurrency: () => 1,
}));

const mockInitTaskRunner = <T, R>(_numOfTasks: number, _workerPath: string, _runtime?: WorkerRuntime) => {
  return {
    run: async (task: T) => {
      return (await fileMetricsWorker(task as FileMetricsTask)) as R;
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
        initTaskRunner: mockInitTaskRunner,
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
        initTaskRunner: mockInitTaskRunner,
      },
    );

    expect(result).toEqual([]);
  });
});
