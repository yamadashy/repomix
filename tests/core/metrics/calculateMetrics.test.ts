import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from '../../../src/core/metrics/calculateMetrics.js';
import { __setTokenCountCacheEnvForTests, getRepoSeenMarkerPath } from '../../../src/core/metrics/tokenCountCache.js';
import { getWorkerThreadCount } from '../../../src/shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Stand-in for initTaskRunner: every created runner resolves tasks to 0 and
// exposes its spies so tests can assert on warm-up dispatches.
const createMockInitTaskRunner = () =>
  vi.fn(() => ({
    run: vi.fn().mockResolvedValue(0),
    cleanup: vi.fn().mockResolvedValue(undefined),
  }));

describe('calculateMetrics', () => {
  it('should calculate metrics and return the result', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    const output = 'a'.repeat(300);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'file1.txt', charCount: 100, tokenCount: 10 },
      { path: 'file2.txt', charCount: 200, tokenCount: 20 },
    ];
    const calculateFileMetrics = vi.fn().mockResolvedValue(fileMetrics);

    const aggregatedResult = {
      totalFiles: 2,
      totalCharacters: 300,
      totalTokens: 30,
      fileCharCounts: {
        'file1.txt': 100,
        'file2.txt': 200,
      },
      fileTokenCounts: {
        'file1.txt': 10,
        'file2.txt': 20,
      },
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
    };

    const config = createMockConfig({ output: { parsableStyle: true } });

    const gitDiffResult: GitDiffResult | undefined = undefined;

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      config,
      gitDiffResult,
      undefined,
      {
        calculateFileMetrics,
        calculateOutputMetrics: async () => 30,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    expect(progressCallback).toHaveBeenCalledWith('Calculating metrics...');
    expect(calculateFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['file1.txt', 'file2.txt'],
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        taskRunner: expect.any(Object),
      }),
    );
    expect(result).toEqual(aggregatedResult);
  });
});

describe('calculateMetrics fast/slow path equivalence', () => {
  // The fast path skips re-tokenizing the full output by summing per-file token counts
  // plus a wrapper-only tokenization. This test pins the invariant that matters most:
  //
  //   Σ(file tokens) + tokens(wrapper) === tokens(full output)
  //
  // We use a length-based token model (1 char = 1 "token") so the math is deterministic
  // and any drift in extractOutputWrapper or the fast-path summation surfaces immediately.
  const makeOutput = (header: string, files: ProcessedFile[], separator: string, footer: string): string =>
    header + files.map((f) => f.content).join(separator) + footer;

  const lengthBasedFileMetrics = async (files: ProcessedFile[]) =>
    files.map((f) => ({ path: f.path, charCount: f.content.length, tokenCount: f.content.length }));

  const lengthBasedOutputMetrics = async (output: string) => output.length;

  // taskRunner.run is invoked by runTokenCount for the wrapper string in the fast path.
  const lengthBasedTaskRunner = {
    run: vi.fn().mockImplementation(({ content }: { content: string }) => Promise.resolve(content.length)),
    cleanup: vi.fn(),
  };

  const sharedDeps = {
    calculateFileMetrics: lengthBasedFileMetrics,
    calculateOutputMetrics: lengthBasedOutputMetrics,
    calculateGitDiffMetrics: () => Promise.resolve(0),
    calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
    taskRunner: lengthBasedTaskRunner,
  };

  const processedFiles: ProcessedFile[] = [
    { path: 'a.ts', content: 'const a = 1;' },
    { path: 'b.ts', content: 'const longer = "more characters here";' },
    { path: 'c.ts', content: 'export {};' },
  ];
  const output = makeOutput('<header>\n', processedFiles, '\n---\n', '\n<footer>');

  it('fast path total equals slow path total for the same content', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Slow path: parsableStyle disables fast path
    const slowResult = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      createMockConfig({ output: { style: 'xml', parsableStyle: true } }),
      undefined,
      undefined,
      sharedDeps,
    );

    // Fast path: plain/markdown/xml without parsableStyle/splitOutput
    const fastResult = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      createMockConfig({ output: { style: 'plain' } }),
      undefined,
      undefined,
      sharedDeps,
    );

    // The whole point of the fast path: same number, just computed differently.
    expect(fastResult.totalTokens).toBe(slowResult.totalTokens);
    expect(fastResult.totalTokens).toBe(output.length);
  });

  it('fast path falls back when file content cannot be located in output', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();
    // Output that does NOT contain the file contents verbatim (escaped, transformed, etc.)
    // forces extractOutputWrapper to return null and the slow path to take over.
    const escapedOutput = '<header>HTML-escaped content here<footer>';

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(escapedOutput),
      progressCallback,
      createMockConfig({ output: { style: 'plain' } }),
      undefined,
      undefined,
      sharedDeps,
    );

    // Slow path totals the full output rather than file contents.
    expect(result.totalTokens).toBe(escapedOutput.length);
  });

  it('slow path is used for split output even when style would otherwise qualify', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();
    const splitOutput = ['<part1>aaa', '<part2>bbb'];
    const expectedTotal = splitOutput.reduce((sum, part) => sum + part.length, 0);

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(splitOutput),
      progressCallback,
      createMockConfig({ output: { style: 'plain', splitOutput: 2 } }),
      undefined,
      undefined,
      sharedDeps,
    );

    expect(result.totalTokens).toBe(expectedTotal);
  });

  it('cleans up the task runner when fileMetrics rejects', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();
    const failingTaskRunner = {
      run: vi.fn().mockResolvedValue(0),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    // No taskRunner in deps means calculateMetrics owns the lifecycle.
    // Inject initTaskRunner to return our spy so we can assert cleanup.
    const initTaskRunner = vi.fn().mockReturnValue(failingTaskRunner);

    await expect(
      calculateMetrics(
        processedFiles,
        Promise.resolve(output),
        progressCallback,
        createMockConfig({ output: { style: 'plain' } }),
        undefined,
        undefined,
        {
          calculateFileMetrics: async () => {
            throw new Error('file metrics failed');
          },
          calculateOutputMetrics: lengthBasedOutputMetrics,
          calculateGitDiffMetrics: () => Promise.resolve(0),
          calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
          initTaskRunner,
          // Intentionally omit taskRunner so calculateMetrics creates and owns one.
        },
      ),
    ).rejects.toThrow('file metrics failed');

    expect(initTaskRunner).toHaveBeenCalledTimes(1);
    expect(failingTaskRunner.cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('createMetricsTaskRunner', () => {
  it('should return a taskRunner and warmupPromise', async () => {
    const result = createMetricsTaskRunner([], 100, 'o200k_base', undefined, {
      initTaskRunner: createMockInitTaskRunner(),
    });

    expect(result).toHaveProperty('taskRunner');
    expect(result).toHaveProperty('warmupPromise');
    expect(result.taskRunner).toHaveProperty('run');
    expect(result.taskRunner).toHaveProperty('cleanup');

    // warmupPromise resolves to one result per prewarm task; the task count follows the host's CPU count,
    // so assert that there is at least one task and that every task returned the mocked 0
    const warmupResults = await result.warmupPromise;
    expect(new Set(warmupResults as number[])).toEqual(new Set([0]));
  });

  it('should fire a warmup task with empty content', async () => {
    const result = createMetricsTaskRunner([], 50, 'cl100k_base', undefined, {
      initTaskRunner: createMockInitTaskRunner(),
    });

    await result.warmupPromise;

    expect(result.taskRunner.run).toHaveBeenCalledWith({ content: '', encoding: 'cl100k_base' });
  });

  it('should swallow warmup task errors', async () => {
    const initTaskRunner = vi.fn().mockReturnValue({
      run: vi.fn().mockRejectedValue(new Error('init failed')),
      cleanup: vi.fn(),
    });

    const result = createMetricsTaskRunner([], 10, 'o200k_base', undefined, { initTaskRunner });

    // warmupPromise should resolve (errors swallowed by .catch on each task)
    const resolved = await result.warmupPromise;
    expect(Array.isArray(resolved)).toBe(true);
    expect((resolved as number[]).every((v) => v === 0)).toBe(true);
  });
});

describe('createMetricsTaskRunner — cache-aware prewarm count', () => {
  // The previous test block (which we keep) pins the warmup-task SHAPE
  // (empty content, error swallowing). This block pins the warmup-task
  // COUNT against the cache/marker heuristic — that is the actual perf
  // contract a future refactor could silently break.
  let tmpDir: string;
  let cacheFile: string;
  const REPO_DIR = '/tmp/test-repo-prewarm-pin';
  const OTHER_REPO_DIR = '/tmp/test-repo-prewarm-other';

  beforeEach(async () => {
    tmpDir = await createTempDir('repomix-prewarm-test-');
    cacheFile = path.join(tmpDir, 'token-counts.json');
    // Enable the cache (no REPOMIX_TOKEN_CACHE=0) and point it at the temp file.
    __setTokenCountCacheEnvForTests({ REPOMIX_TOKEN_CACHE_PATH: cacheFile });
  });

  afterEach(() => {
    __setTokenCountCacheEnvForTests();
  });

  it('prewarms exactly 1 worker when shared cache + this-repo marker both exist (warm-likely)', async () => {
    // Set up: shared cache file present AND marker for REPO_DIR present.
    await fs.mkdir(path.dirname(cacheFile), { recursive: true });
    await fs.writeFile(cacheFile, '{"version":1,"entries":{}}');
    const markerPath = getRepoSeenMarkerPath([REPO_DIR]);
    await fs.mkdir(path.dirname(markerPath), { recursive: true });
    await fs.writeFile(markerPath, '');

    const result = createMetricsTaskRunner([REPO_DIR], 1000, 'o200k_base', undefined, {
      initTaskRunner: createMockInitTaskRunner(),
    });
    await result.warmupPromise;

    expect(result.taskRunner.run).toHaveBeenCalledTimes(1);
    expect(result.taskRunner.run).toHaveBeenCalledWith({ content: '', encoding: 'o200k_base' });
  });

  it('prewarms the full maxThreads when cache exists but THIS repo marker is missing', async () => {
    // Cache file present from some other repo, but no marker for OTHER_REPO_DIR.
    await fs.mkdir(path.dirname(cacheFile), { recursive: true });
    await fs.writeFile(cacheFile, '{"version":1,"entries":{}}');

    const result = createMetricsTaskRunner([OTHER_REPO_DIR], 1000, 'o200k_base', undefined, {
      initTaskRunner: createMockInitTaskRunner(),
    });
    await result.warmupPromise;

    // Compute the expected `maxThreads` from the same heuristic the production
    // path uses (`min(cpu, ceil(N/100))`) so the assertion is portable across
    // 1-vCPU / 2-vCPU / N-vCPU CI runners alike.
    const { maxThreads } = getWorkerThreadCount(1000);
    expect((result.taskRunner.run as Mock).mock.calls.length).toBe(maxThreads);
  });

  it('prewarms the full maxThreads when shared cache file is missing (cold)', async () => {
    // No cache file, no marker.
    const result = createMetricsTaskRunner([REPO_DIR], 1000, 'o200k_base', undefined, {
      initTaskRunner: createMockInitTaskRunner(),
    });
    await result.warmupPromise;

    const { maxThreads } = getWorkerThreadCount(1000);
    expect((result.taskRunner.run as Mock).mock.calls.length).toBe(maxThreads);
  });
});
