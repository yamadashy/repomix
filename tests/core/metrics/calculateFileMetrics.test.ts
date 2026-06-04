import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateFileMetrics } from '../../../src/core/metrics/calculateFileMetrics.js';
import type { MetricsTaskRunner } from '../../../src/core/metrics/metricsWorkerRunner.js';
import {
  __resetTokenCountCacheForTests,
  contentCacheKey,
  setCached,
} from '../../../src/core/metrics/tokenCountCache.js';
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
  // The suite-wide `tests/testing/vitestSetup.ts` disables the token-count
  // cache so worker-dispatch assertions stay deterministic across tests. The
  // cache-enabled scenarios below opt back in per-test and reset the module
  // state in their own setup/teardown.

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

  // Guards multi-root packs: the same relative path can appear with different
  // content from different roots. Results must be returned per input index,
  // not collapsed by path.
  it('keeps duplicate relative paths separate when contents differ', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'README.md', content: 'first root content' },
      { path: 'README.md', content: 'second root content — much longer payload here' },
    ];
    const targetFilePaths = processedFiles.map((f) => f.path);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
      taskRunner: mockInitTaskRunner({ numOfTasks: 2, workerType: 'calculateMetrics', runtime: 'worker_threads' }),
    });

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('README.md');
    expect(result[1].path).toBe('README.md');
    expect(result[0].charCount).toBe(processedFiles[0].content.length);
    expect(result[1].charCount).toBe(processedFiles[1].content.length);
    // Different content → different token counts; the merge must not pick the
    // same FileMetrics for both indices.
    expect(result[0].tokenCount).not.toBe(result[1].tokenCount);
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

  // The suite-wide vitest setup disables the token-count cache so worker-
  // dispatch assertions elsewhere are not skewed by cross-test pollution. The
  // production cache-hit fast path is therefore not exercised by the default
  // tests — these scenarios opt back in and assert the end-to-end behavior.
  describe('token-count cache (production path)', () => {
    let prevCacheEnv: string | undefined;

    beforeEach(() => {
      prevCacheEnv = process.env.REPOMIX_TOKEN_CACHE;
      delete process.env.REPOMIX_TOKEN_CACHE;
      __resetTokenCountCacheForTests();
    });

    afterEach(() => {
      if (prevCacheEnv === undefined) {
        delete process.env.REPOMIX_TOKEN_CACHE;
      } else {
        process.env.REPOMIX_TOKEN_CACHE = prevCacheEnv;
      }
      __resetTokenCountCacheForTests();
    });

    it('skips worker dispatch entirely on a second run when every file is cached', async () => {
      const processedFiles: ProcessedFile[] = [
        { path: 'a.txt', content: 'hello world' },
        { path: 'b.txt', content: 'goodbye world' },
      ];
      const targetFilePaths = processedFiles.map((f) => f.path);
      const progressCallback: RepomixProgressCallback = vi.fn();

      const taskRunner = mockInitTaskRunner({
        numOfTasks: 2,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      });
      const runSpy = vi.spyOn(taskRunner, 'run');

      // First run: cold cache — every file dispatches to a worker batch.
      const first = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
        taskRunner,
      });
      expect(first).toHaveLength(2);
      expect(runSpy.mock.calls.length).toBeGreaterThan(0);

      // Second run with identical inputs: every file should hit the in-memory
      // cache populated by the first run, so taskRunner.run must not be
      // invoked at all.
      runSpy.mockClear();
      const second = await calculateFileMetrics(processedFiles, targetFilePaths, 'o200k_base', progressCallback, {
        taskRunner,
      });

      expect(runSpy.mock.calls.length).toBe(0);
      expect(second).toEqual(first);
    });

    // A `tokenCacheKey` precomputed during the security-check window (see
    // packager.ts) must be reused verbatim for the cache lookup, so the per-file
    // MD5 hashing does not run again on the metrics critical path. We prove reuse
    // by seeding the cache under an arbitrary (non-content) key and pointing the
    // file's `tokenCacheKey` at it: a hit can only happen if the precomputed key
    // — not a freshly hashed content key — drove the lookup.
    it('reuses a precomputed tokenCacheKey for the cache lookup', async () => {
      const fakeKey = 'o200k_base:9999:0123456789abcdef';
      setCached(fakeKey, 4242);

      const processedFiles: ProcessedFile[] = [{ path: 'a.txt', content: 'hello world', tokenCacheKey: fakeKey }];
      const progressCallback: RepomixProgressCallback = vi.fn();

      const taskRunner = mockInitTaskRunner({
        numOfTasks: 1,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      });
      const runSpy = vi.spyOn(taskRunner, 'run');

      const result = await calculateFileMetrics(processedFiles, ['a.txt'], 'o200k_base', progressCallback, {
        taskRunner,
      });

      expect(runSpy.mock.calls.length).toBe(0);
      expect(result).toEqual([{ path: 'a.txt', charCount: 'hello world'.length, tokenCount: 4242 }]);
    });

    // Defensive guard: a precomputed key carried over from a different encoding
    // must be ignored (the prefix check), so it can never alias another
    // encoding's cached count. The key is recomputed for the active encoding and
    // the real token count is produced.
    it('ignores a precomputed tokenCacheKey from a different encoding', async () => {
      const content = 'hello world';
      // Seed the wrong-encoding key with a sentinel that must NOT surface.
      const wrongEncodingKey = contentCacheKey('cl100k_base', content);
      setCached(wrongEncodingKey, 9999);

      const processedFiles: ProcessedFile[] = [{ path: 'a.txt', content, tokenCacheKey: wrongEncodingKey }];
      const progressCallback: RepomixProgressCallback = vi.fn();

      const taskRunner = mockInitTaskRunner({
        numOfTasks: 1,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      });
      const runSpy = vi.spyOn(taskRunner, 'run');

      const result = await calculateFileMetrics(processedFiles, ['a.txt'], 'o200k_base', progressCallback, {
        taskRunner,
      });

      // Prefix mismatch → recompute under o200k_base → miss → worker dispatch.
      expect(runSpy.mock.calls.length).toBeGreaterThan(0);
      expect(result[0].tokenCount).not.toBe(9999);
      expect(result[0].tokenCount).toBeGreaterThan(0);
    });

    // A precomputed key with the right encoding prefix but absent from the cache
    // (e.g. evicted, or a genuine first-seen file) must drive the lookup, miss,
    // dispatch to a worker, and then cache the real count under that same key.
    it('falls through to a worker when a correct-prefix precomputed key is not cached', async () => {
      const content = 'hello world';
      const file: ProcessedFile = { path: 'a.txt', content, tokenCacheKey: 'o200k_base:9999:0123456789abcdef' };
      const progressCallback: RepomixProgressCallback = vi.fn();

      const taskRunner = mockInitTaskRunner({
        numOfTasks: 1,
        workerType: 'calculateMetrics',
        runtime: 'worker_threads',
      });
      const runSpy = vi.spyOn(taskRunner, 'run');

      // Cache intentionally NOT seeded under the precomputed key.
      const result = await calculateFileMetrics([file], ['a.txt'], 'o200k_base', progressCallback, { taskRunner });

      expect(runSpy.mock.calls.length).toBeGreaterThan(0);
      expect(result[0].charCount).toBe(content.length);
      expect(result[0].tokenCount).toBeGreaterThan(0);
    });
  });
});
