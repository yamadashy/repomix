import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateFileMetrics, packBatchesByBytes } from '../../../src/core/metrics/calculateFileMetrics.js';
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
});

describe('packBatchesByBytes', () => {
  const file = (path: string, bytes: number): ProcessedFile => ({ path, content: 'a'.repeat(bytes) });
  const totalBytes = (batch: ProcessedFile[]) => batch.reduce((s, f) => s + f.content.length, 0);

  it('packs into byte-balanced batches that respect the byte target', () => {
    const files = [file('a', 100), file('b', 200), file('c', 50), file('d', 80), file('e', 120)];
    const batches = packBatchesByBytes(files, 250, 100);
    for (const b of batches) {
      // A batch may exceed the target only if it holds a single oversized file;
      // otherwise the running total when we flushed must have been within target.
      expect(totalBytes(b) <= 250 || b.length === 1).toBe(true);
      expect(b.length).toBeGreaterThan(0);
    }
    // No file is dropped or duplicated.
    expect(
      batches
        .flat()
        .map((f) => f.path)
        .sort(),
    ).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('emits batches in largest-bytes-first order for FIFO LPT scheduling', () => {
    const files = [file('a', 10), file('b', 200), file('c', 20), file('d', 150), file('e', 30)];
    const batches = packBatchesByBytes(files, 100, 100);
    const sizes = batches.map(totalBytes);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it('puts a single oversized file in its own batch', () => {
    const files = [file('small1', 10), file('huge', 5000), file('small2', 20)];
    const batches = packBatchesByBytes(files, 100, 100);
    const hugeBatch = batches.find((b) => b.some((f) => f.path === 'huge'));
    expect(hugeBatch).toBeDefined();
    expect(hugeBatch).toEqual([files[1]]);
  });

  it('flushes when the file count cap is hit even if bytes are well under target', () => {
    const files = Array.from({ length: 25 }, (_, i) => file(`f${i}`, 1));
    const batches = packBatchesByBytes(files, 1024 * 1024, 10);
    expect(batches).toHaveLength(3);
    for (const b of batches) {
      expect(b.length).toBeLessThanOrEqual(10);
    }
    expect(batches.flat()).toHaveLength(25);
  });

  it('returns an empty array for empty input', () => {
    expect(packBatchesByBytes([], 1024, 100)).toEqual([]);
  });
});
