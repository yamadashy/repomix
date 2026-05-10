import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { pack } from '../../src/core/packager.js';
import { createMockConfig } from '../testing/testUtils.js';

vi.mock('node:fs/promises');
vi.mock('fs/promises');
vi.mock('../../src/core/metrics/TokenCounter.js', () => {
  return {
    TOKEN_ENCODINGS: ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'],
    TokenCounter: vi.fn().mockImplementation(() => ({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    })),
  };
});

describe('packager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('pack should orchestrate packing files and generating output', async () => {
    const file2Path = path.join('dir1', 'file2.txt');
    const mockRawFiles = [
      { path: 'file1.txt', content: 'raw content 1' },
      { path: file2Path, content: 'raw content 2' },
    ];
    const mockProcessedFiles = [
      { path: 'file1.txt', content: 'processed content 1' },
      { path: file2Path, content: 'processed content 2' },
    ];
    const mockOutput = 'mock output';
    const mockFilePaths = ['file1.txt', file2Path];

    const mockDeps = {
      searchFiles: vi.fn().mockResolvedValue({
        filePaths: mockFilePaths,
        emptyDirPaths: [],
      }),
      sortPaths: vi.fn().mockImplementation((paths) => paths),
      collectFiles: vi.fn().mockResolvedValue({ rawFiles: mockRawFiles, skippedFiles: [] }),
      processFiles: vi.fn().mockReturnValue(mockProcessedFiles),
      validateFileSafety: vi.fn().mockResolvedValue({
        safeFilePaths: mockFilePaths,
        safeRawFiles: mockRawFiles,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
      }),
      produceOutput: vi.fn().mockResolvedValue({
        outputForMetrics: mockOutput,
      }),
      createMetricsTaskRunner: vi.fn().mockReturnValue({
        taskRunner: {
          run: vi.fn().mockResolvedValue(0),
          cleanup: vi.fn().mockResolvedValue(undefined),
        },
        warmupPromise: Promise.resolve(),
      }),
      createSecurityTaskRunner: vi.fn().mockReturnValue({
        taskRunner: {
          run: vi.fn().mockResolvedValue([]),
          cleanup: vi.fn().mockResolvedValue(undefined),
        },
        warmupPromise: Promise.resolve(),
      }),
      // Mock the security-check cache probe so the test does not depend on
      // /tmp filesystem state from prior runs. Returning false matches the
      // documented "force the cold-cache path" intent of this test.
      securityCheckCacheUsable: vi.fn().mockReturnValue(false),
      calculateMetrics: vi.fn().mockResolvedValue({
        totalFiles: 2,
        totalCharacters: 11,
        totalTokens: 10,
        fileCharCounts: {
          'file1.txt': 19,
          [file2Path]: 19,
        },
        fileTokenCounts: {
          'file1.txt': 10,
          [file2Path]: 10,
        },
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
      }),
    };

    const mockConfig = createMockConfig();
    const progressCallback = vi.fn();
    const result = await pack(['root'], mockConfig, progressCallback, mockDeps);

    expect(mockDeps.searchFiles).toHaveBeenCalledWith('root', mockConfig, undefined);
    expect(mockDeps.collectFiles).toHaveBeenCalledWith(mockFilePaths, 'root', mockConfig, progressCallback);
    expect(mockDeps.validateFileSafety).toHaveBeenCalled();
    expect(mockDeps.processFiles).toHaveBeenCalled();
    expect(mockDeps.produceOutput).toHaveBeenCalled();
    expect(mockDeps.calculateMetrics).toHaveBeenCalled();

    expect(mockDeps.validateFileSafety).toHaveBeenCalledWith(
      mockRawFiles,
      progressCallback,
      mockConfig,
      undefined,
      undefined,
      expect.objectContaining({ taskRunner: expect.any(Object) }),
    );
    expect(mockDeps.processFiles).toHaveBeenCalledWith(mockRawFiles, mockConfig, progressCallback);
    expect(mockDeps.produceOutput).toHaveBeenCalledWith(
      ['root'],
      mockConfig,
      mockProcessedFiles,
      mockFilePaths,
      undefined,
      undefined,
      progressCallback,
      [{ rootLabel: 'root', files: mockFilePaths }],
      undefined,
    );
    expect(mockDeps.calculateMetrics).toHaveBeenCalledWith(
      mockProcessedFiles,
      expect.anything(),
      progressCallback,
      mockConfig,
      undefined,
      undefined,
      expect.objectContaining({ taskRunner: expect.anything() }),
    );

    // Verify that calculateMetrics received a promise that resolves to the expected output
    const outputArg = mockDeps.calculateMetrics.mock.calls[0][1];
    await expect(outputArg).resolves.toBe(mockOutput);

    // Check the result of pack function
    expect(result.totalFiles).toBe(2);
    expect(result.totalCharacters).toBe(11);
    expect(result.totalTokens).toBe(10);
    expect(result.fileCharCounts).toEqual({
      'file1.txt': 19,
      [file2Path]: 19,
    });
    expect(result.fileTokenCounts).toEqual({
      'file1.txt': 10,
      [file2Path]: 10,
    });
    expect(result.skippedFiles).toEqual([]);
  });

  describe('parallel error handling', () => {
    // The pipeline runs several stages in parallel (security check + file processing,
    // output generation + metrics). Regressions in error propagation or worker cleanup
    // are easy to introduce when adding parallel branches.
    const mockFilePaths = ['file1.txt'];
    const mockRawFiles = [{ path: 'file1.txt', content: 'raw' }];
    const mockProcessedFiles = [{ path: 'file1.txt', content: 'processed' }];

    const baseDeps = () => {
      const cleanup = vi.fn().mockResolvedValue(undefined);
      return {
        cleanup,
        deps: {
          searchFiles: vi.fn().mockResolvedValue({ filePaths: mockFilePaths, emptyDirPaths: [] }),
          sortPaths: vi.fn().mockImplementation((p) => p),
          collectFiles: vi.fn().mockResolvedValue({ rawFiles: mockRawFiles, skippedFiles: [] }),
          processFiles: vi.fn().mockResolvedValue(mockProcessedFiles),
          validateFileSafety: vi.fn().mockResolvedValue({
            safeFilePaths: mockFilePaths,
            safeRawFiles: mockRawFiles,
            suspiciousFilesResults: [],
            suspiciousGitDiffResults: [],
            suspiciousGitLogResults: [],
          }),
          produceOutput: vi.fn().mockResolvedValue({ outputForMetrics: 'output' }),
          // Mirror real calculateMetrics behavior: await the outputForMetrics promise so a
          // produceOutput rejection propagates here instead of becoming unhandled.
          calculateMetrics: vi.fn().mockImplementation(async (_files, outputPromise) => {
            await outputPromise;
            return {
              totalFiles: 1,
              totalCharacters: 9,
              totalTokens: 1,
              fileCharCounts: { 'file1.txt': 9 },
              fileTokenCounts: { 'file1.txt': 1 },
              gitDiffTokenCount: 0,
              gitLogTokenCount: 0,
            };
          }),
          createMetricsTaskRunner: vi.fn().mockReturnValue({
            taskRunner: { run: vi.fn().mockResolvedValue(0), cleanup },
            warmupPromise: Promise.resolve(),
          }),
          createSecurityTaskRunner: vi.fn().mockReturnValue({
            taskRunner: { run: vi.fn().mockResolvedValue([]), cleanup: vi.fn().mockResolvedValue(undefined) },
            warmupPromise: Promise.resolve(),
          }),
          getGitDiffs: vi.fn().mockResolvedValue(undefined),
          getGitLogs: vi.fn().mockResolvedValue(undefined),
          prefetchSortData: vi.fn().mockResolvedValue(undefined),
          sortOutputFiles: vi.fn().mockImplementation((files) => files),
          // Default: assume the persistent token-count cache is missing so the
          // metrics warm-up sizes for the cold-cache path. Tests targeting the
          // warm-cache path override this to return true.
          tokenCountCacheFileExists: vi.fn().mockReturnValue(false),
          // Same default for the security-check cache: force the cold-cache
          // path so the security pool warm-up gate (`!cacheFileExists()`)
          // remains true unless a test opts in by overriding the mock.
          securityCheckCacheUsable: vi.fn().mockReturnValue(false),
        },
      };
    };

    test('cleans up the metrics worker pool when searchFiles rejects', async () => {
      // The metrics worker pool is created before searchFiles so its BPE warm-up
      // can overlap with the glob scan. A searchFiles rejection must still trigger
      // the pool cleanup via the surrounding try/finally.
      const { cleanup, deps } = baseDeps();
      deps.searchFiles = vi.fn().mockRejectedValue(new Error('search failed'));

      await expect(pack(['root'], createMockConfig(), vi.fn(), deps)).rejects.toThrow('search failed');

      expect(cleanup).toHaveBeenCalled();
    });

    test('cleans up the metrics worker pool when validateFileSafety rejects', async () => {
      const { cleanup, deps } = baseDeps();
      deps.validateFileSafety = vi.fn().mockRejectedValue(new Error('security check failed'));

      await expect(pack(['root'], createMockConfig(), vi.fn(), deps)).rejects.toThrow('security check failed');

      expect(cleanup).toHaveBeenCalled();
    });

    test('cleans up the metrics worker pool when produceOutput rejects', async () => {
      const { cleanup, deps } = baseDeps();
      deps.produceOutput = vi.fn().mockRejectedValue(new Error('output failed'));

      await expect(pack(['root'], createMockConfig(), vi.fn(), deps)).rejects.toThrow('output failed');

      expect(cleanup).toHaveBeenCalled();
    });

    test('cleans up the metrics worker pool when calculateMetrics rejects', async () => {
      const { cleanup, deps } = baseDeps();
      deps.calculateMetrics = vi.fn().mockRejectedValue(new Error('metrics failed'));

      await expect(pack(['root'], createMockConfig(), vi.fn(), deps)).rejects.toThrow('metrics failed');

      expect(cleanup).toHaveBeenCalled();
    });

    test('a prefetchSortData failure does not block the pipeline', async () => {
      const { cleanup, deps } = baseDeps();
      deps.prefetchSortData = vi.fn().mockRejectedValue(new Error('git failed'));

      const result = await pack(['root'], createMockConfig(), vi.fn(), deps);

      // Pack should complete successfully even though the prefetch failed.
      expect(result.totalFiles).toBe(1);
      expect(deps.sortOutputFiles).toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalled();
    });

    test('uses 3 warm-up workers for the metrics pool when no scope is specified and token cache is cold', async () => {
      // The eager metrics warm-up sizes the pool via numOfTasks. When the user did
      // not constrain the file set (no --include / no --stdin) AND no persistent
      // token-count cache file exists from a prior run, the metrics phase has to
      // tokenize every file and is typically long enough to amortize a 3rd worker's
      // BPE warm-up, so we pass numOfTasks = 3 * TASKS_PER_THREAD = 600 (yielding
      // maxThreads=min(cpuCount, 3)).
      const { deps } = baseDeps();
      deps.tokenCountCacheFileExists = vi.fn().mockReturnValue(false);
      const config = createMockConfig();
      config.include = [];

      await pack(['root'], config, vi.fn(), deps);

      expect(deps.createMetricsTaskRunner).toHaveBeenCalledWith(600, expect.any(String));
      // Same gate also enables the security pool pre-warm on the unscoped path.
      expect(deps.createSecurityTaskRunner).toHaveBeenCalled();
    });

    test('uses 1 warm-up worker for the metrics pool when no scope is specified but the token cache is warm', async () => {
      // When the persistent token-count cache file already exists from a previous
      // run, almost every per-file token count is served from cache and the metrics
      // phase performs only a small fixed set of dispatches that survive caching:
      // a wrapper-token tokenization (cache hit after run #2) and, when opted in,
      // git diff staged/worktree and git log token counts. Worst-case 2–3 short
      // tasks fit one warm worker serially in well under 30 ms. Spawning extra
      // warm workers means each one parses the ~2.2 MB o200k_base BPE table
      // (~340 ms of pure CPU), contending with the file-collection main thread
      // AND extending the final `pool.destroy()` (BPE-loaded workers take ~21 ms
      // to terminate vs ~3 ms when idle). The heuristic therefore falls back to
      // numOfTasks = 1 * TASKS_PER_THREAD = 200 (yielding maxThreads=min(cpuCount, 1)=1
      // and a single warmup task).
      const { deps } = baseDeps();
      deps.tokenCountCacheFileExists = vi.fn().mockReturnValue(true);
      const config = createMockConfig();
      config.include = [];

      await pack(['root'], config, vi.fn(), deps);

      expect(deps.createMetricsTaskRunner).toHaveBeenCalledWith(200, expect.any(String));
      // The security pool pre-warm is unaffected by the cache state — its gate is
      // still `hasExplicitScope`, which is false here.
      expect(deps.createSecurityTaskRunner).toHaveBeenCalled();
    });

    test('uses 2 warm-up workers for the metrics pool when --include narrows scope', async () => {
      // With explicit includes the file set is typically much smaller and the
      // 3rd worker's BPE warm-up dominates the parallelism gain (paired benchmarks
      // regressed by ~12% on the 258-file --include 'src,tests' workload), so the
      // heuristic falls back to 2 warm workers. The same `hasExplicitScope`
      // gate also disables the security pool pre-warm in this branch — its
      // up-front cost outweighs the saved cold-start on small/scoped runs.
      const { deps } = baseDeps();
      const config = createMockConfig();
      config.include = ['src'];

      await pack(['root'], config, vi.fn(), deps);

      expect(deps.createMetricsTaskRunner).toHaveBeenCalledWith(400, expect.any(String));
      expect(deps.createSecurityTaskRunner).not.toHaveBeenCalled();
    });

    test('uses 2 warm-up workers for the metrics pool when explicitFiles is provided (--stdin)', async () => {
      const { deps } = baseDeps();
      const config = createMockConfig();
      config.include = [];

      await pack(['root'], config, vi.fn(), deps, ['file1.txt', 'file2.txt']);

      expect(deps.createMetricsTaskRunner).toHaveBeenCalledWith(400, expect.any(String));
      // The security pool pre-warm shares the `hasExplicitScope` gate — when --stdin
      // (explicitFiles) provides the file set, the pre-warm is skipped to avoid the
      // pool-construction overhead that outweighs the saved cold-start on small runs.
      expect(deps.createSecurityTaskRunner).not.toHaveBeenCalled();
    });

    test('cleans up the metrics worker pool even when the warmup promise rejects', async () => {
      const { cleanup, deps } = baseDeps();
      // Pre-attach a no-op handler so the rejection is observed at construction time,
      // before pack() reaches `await metricsWarmupPromise`. Production code mirrors this
      // with `.catch(() => {})` in packager.ts:262, so the warmup rejection is fully
      // contained — but vitest's unhandled-rejection detector can flag it eagerly here.
      const warmupPromise = Promise.reject(new Error('warmup failed'));
      warmupPromise.catch(() => {});
      deps.createMetricsTaskRunner = vi.fn().mockReturnValue({
        taskRunner: { run: vi.fn().mockResolvedValue(0), cleanup },
        warmupPromise,
      });

      await expect(pack(['root'], createMockConfig(), vi.fn(), deps)).rejects.toThrow('warmup failed');

      expect(cleanup).toHaveBeenCalled();
    });
  });
});
