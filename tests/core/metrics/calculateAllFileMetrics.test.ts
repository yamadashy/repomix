import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateAllFileMetrics } from '../../../src/core/metrics/calculateAllFileMetrics.js';
import type { FileMetricsTask } from '../../../src/core/metrics/workers/fileMetricsWorker.js';
import fileMetricsWorker from '../../../src/core/metrics/workers/fileMetricsWorker.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('../../shared/processConcurrency', () => ({
  getProcessConcurrency: () => 1,
}));

const mockInitTaskRunner = (numOfTasks: number) => {
  return async (task: FileMetricsTask) => {
    return await fileMetricsWorker(task);
  };
};

describe('calculateAllFileMetrics', () => {
  it('should calculate metrics for all files', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateAllFileMetrics(processedFiles, 'o200k_base', progressCallback, {
      initTaskRunner: mockInitTaskRunner,
    });

    expect(result).toEqual([
      { path: 'file1.txt', charCount: 100, tokenCount: 13 },
      { path: 'file2.txt', charCount: 200, tokenCount: 50 },
    ]);
  });
});
