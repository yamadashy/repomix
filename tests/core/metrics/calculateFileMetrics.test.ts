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
  it('should send large files to worker for BPE tokenization', async () => {
    // Files above the small-file threshold (200000 chars) are sent to workers.
    // Use a lightweight mock to avoid slow real BPE in tests.
    const processedFiles: ProcessedFile[] = [
      { path: 'large1.txt', content: 'a'.repeat(200001) },
      { path: 'large2.txt', content: 'b'.repeat(200002) },
      { path: 'large3.txt', content: 'c'.repeat(200003) },
    ];
    const targetFilePaths = ['large1.txt', 'large3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Mock task runner that returns a fixed token count per item
    const fastMockRunner: MetricsTaskRunner = {
      run: async (task: MetricsWorkerTask) => {
        if ('items' in task) {
          const batchTask = task as TokenCountBatchTask;
          return batchTask.items.map((item) => Math.ceil(item.content.length / 4));
        }
        const t = task as TokenCountTask;
        return Math.ceil(t.content.length / 4);
      },
      cleanup: async () => {},
    };

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: fastMockRunner,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ path: 'large1.txt', charCount: 200001, tokenCount: Math.ceil(200001 / 4) });
    expect(result[1]).toEqual({ path: 'large3.txt', charCount: 200003, tokenCount: Math.ceil(200003 / 4) });
  });

  it('should estimate metrics for small files without worker IPC', async () => {
    // Files at or below the small-file threshold (200000 characters) are estimated
    // .txt files use the default ratio (3.5 for o200k_base)
    const processedFiles: ProcessedFile[] = [
      { path: 'small1.txt', content: 'a'.repeat(100) },
      { path: 'small2.txt', content: 'b'.repeat(500) },
      { path: 'small3.txt', content: 'c'.repeat(200000) },
    ];
    const targetFilePaths = ['small1.txt', 'small2.txt', 'small3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toHaveLength(3);
    // Estimates use Math.ceil(charCount / ratio) where ratio depends on file extension
    // .txt uses default 3.5 for o200k_base
    expect(result[0]).toEqual({ path: 'small1.txt', charCount: 100, tokenCount: Math.ceil(100 / 3.5) });
    expect(result[1]).toEqual({ path: 'small2.txt', charCount: 500, tokenCount: Math.ceil(500 / 3.5) });
    expect(result[2]).toEqual({ path: 'small3.txt', charCount: 200000, tokenCount: Math.ceil(200000 / 3.5) });
  });

  it('should use extension-specific chars/token ratios for code files', async () => {
    // Code files (.ts) use a higher chars/token ratio (4.0 for o200k_base)
    // because BPE tokenizers efficiently merge programming patterns
    const processedFiles: ProcessedFile[] = [
      { path: 'src/app.ts', content: 'a'.repeat(4000) },
      { path: 'data.json', content: 'b'.repeat(4000) },
      { path: 'readme.md', content: 'c'.repeat(4000) },
    ];
    const targetFilePaths = ['src/app.ts', 'data.json', 'readme.md'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toHaveLength(3);
    // .ts (code) → 4.0 chars/token for o200k_base
    expect(result[0]).toEqual({ path: 'src/app.ts', charCount: 4000, tokenCount: Math.ceil(4000 / 4.0) });
    // .json (data) → 3.8 chars/token for o200k_base
    expect(result[1]).toEqual({ path: 'data.json', charCount: 4000, tokenCount: Math.ceil(4000 / 3.8) });
    // .md (default) → 3.5 chars/token for o200k_base
    expect(result[2]).toEqual({ path: 'readme.md', charCount: 4000, tokenCount: Math.ceil(4000 / 3.5) });
  });

  it('should use encoding-specific chars/token ratio for estimates', async () => {
    // .txt files use the default ratio; p50k_base default is 3.2
    const processedFiles: ProcessedFile[] = [{ path: 'small.txt', content: 'a'.repeat(100) }];
    const targetFilePaths = ['small.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'p50k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result[0]).toEqual({ path: 'small.txt', charCount: 100, tokenCount: Math.ceil(100 / 3.2) });
  });

  it('should use encoding-specific code ratio for code files', async () => {
    // .ts files use the code ratio; p50k_base code ratio is 3.6
    const processedFiles: ProcessedFile[] = [{ path: 'app.ts', content: 'a'.repeat(100) }];
    const targetFilePaths = ['app.ts'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'p50k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 1, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result[0]).toEqual({ path: 'app.ts', charCount: 100, tokenCount: Math.ceil(100 / 3.6) });
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
      { path: 'large.txt', content: 'b'.repeat(200001) },
    ];
    const targetFilePaths = ['small.txt', 'large.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Mock task runner that returns fixed token counts for large files
    const fastMockRunner: MetricsTaskRunner = {
      run: async (task: MetricsWorkerTask) => {
        if ('items' in task) {
          const batchTask = task as TokenCountBatchTask;
          return batchTask.items.map((item) => Math.ceil(item.content.length / 4));
        }
        const t = task as TokenCountTask;
        return Math.ceil(t.content.length / 4);
      },
      cleanup: async () => {},
    };

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: fastMockRunner,
    });

    expect(result).toHaveLength(2);
    // Small file gets estimate (.txt → default 3.5 chars/token for o200k_base)
    expect(result[0]).toEqual({ path: 'small.txt', charCount: 100, tokenCount: Math.ceil(100 / 3.5) });
    // Large file (>200000 chars) goes to worker
    expect(result[1]).toEqual({ path: 'large.txt', charCount: 200001, tokenCount: Math.ceil(200001 / 4) });
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
