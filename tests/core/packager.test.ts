import { beforeEach, describe, expect, test, vi } from 'vitest';
import { pack } from '../../src/core/packager.js';
import { createMetricsTaskRunnerDouble } from '../testing/taskRunnerDoubles.js';
import { createMockConfig } from '../testing/testUtils.js';

describe('packager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('pack should orchestrate packing files and generating output', async () => {
    // Use a POSIX separator: globby yields forward-slash paths on every platform
    // and pack() normalizes display paths to forward slashes, so the mock must match
    // that (path.join would emit "dir1\\file2.txt" on Windows and fail the assertion).
    const file2Path = 'dir1/file2.txt';
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
      createMetricsTaskRunner: createMetricsTaskRunnerDouble().createMetricsTaskRunner,
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

    expect(mockDeps.searchFiles).toHaveBeenCalledWith('root', mockConfig, undefined, undefined);
    expect(mockDeps.collectFiles).toHaveBeenCalledWith(mockFilePaths, 'root', mockConfig, progressCallback);
    expect(mockDeps.validateFileSafety).toHaveBeenCalled();
    expect(mockDeps.processFiles).toHaveBeenCalled();
    expect(mockDeps.produceOutput).toHaveBeenCalled();
    expect(mockDeps.calculateMetrics).toHaveBeenCalled();

    // pack() resolves each file's inclusion level (against its per-root-relative
    // path) and carries it on the raw file before handing them to the security
    // check and file processing. With the default config every file resolves to
    // 'full'.
    const expectedLeveledRawFiles = mockRawFiles.map((file) => ({ ...file, level: 'full' as const }));
    expect(mockDeps.validateFileSafety).toHaveBeenCalledWith(
      expectedLeveledRawFiles,
      progressCallback,
      mockConfig,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(mockDeps.processFiles).toHaveBeenCalledWith(
      expectedLeveledRawFiles,
      mockConfig,
      progressCallback,
      undefined,
      undefined,
    );
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

  test('applies file processors per root and passes the transformed content to the security check and processing', async () => {
    const collectedRawFiles = [{ path: 'a.json', content: 'raw content' }];
    const transformedRawFiles = [{ path: 'a.json', content: 'transformed content' }];
    const mockFilePaths = ['a.json'];

    const applyFileProcessors = vi.fn().mockResolvedValue(transformedRawFiles);

    const mockDeps = {
      searchFiles: vi.fn().mockResolvedValue({ filePaths: mockFilePaths, emptyDirPaths: [] }),
      sortPaths: vi.fn().mockImplementation((paths) => paths),
      collectFiles: vi.fn().mockResolvedValue({ rawFiles: collectedRawFiles, skippedFiles: [] }),
      applyFileProcessors,
      processFiles: vi.fn().mockReturnValue([{ path: 'a.json', content: 'transformed content' }]),
      validateFileSafety: vi.fn().mockResolvedValue({
        safeFilePaths: mockFilePaths,
        safeRawFiles: transformedRawFiles,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
      }),
      produceOutput: vi.fn().mockResolvedValue({ outputForMetrics: 'out' }),
      createMetricsTaskRunner: createMetricsTaskRunnerDouble().createMetricsTaskRunner,
      calculateMetrics: vi.fn().mockResolvedValue({
        totalFiles: 1,
        totalCharacters: 0,
        totalTokens: 0,
        fileCharCounts: {},
        fileTokenCounts: {},
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
      }),
    };

    const config = createMockConfig();
    const progressCallback = vi.fn();
    await pack(['root'], config, progressCallback, mockDeps);

    // Processors run per root, on the collected per-root-relative files (before path rewrite).
    expect(applyFileProcessors).toHaveBeenCalledWith(collectedRawFiles, 'root', config, progressCallback);

    // The security scan and file processing must operate on the TRANSFORMED content
    // (what actually ships), not the original collected content.
    expect(mockDeps.validateFileSafety).toHaveBeenCalledWith(
      [expect.objectContaining({ path: 'a.json', content: 'transformed content' })],
      progressCallback,
      config,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(mockDeps.processFiles).toHaveBeenCalledWith(
      [expect.objectContaining({ path: 'a.json', content: 'transformed content' })],
      config,
      progressCallback,
      undefined,
      undefined,
    );
  });

  describe('parallel error handling', () => {
    // The pipeline runs several stages in parallel (security check + file processing,
    // output generation + metrics). Regressions in error propagation or worker cleanup
    // are easy to introduce when adding parallel branches.
    const mockFilePaths = ['file1.txt'];
    const mockRawFiles = [{ path: 'file1.txt', content: 'raw' }];
    const mockProcessedFiles = [{ path: 'file1.txt', content: 'processed' }];

    const baseDeps = () => {
      const metricsTaskRunner = createMetricsTaskRunnerDouble();
      return {
        cleanup: metricsTaskRunner.taskRunner.cleanup,
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
          createMetricsTaskRunner: metricsTaskRunner.createMetricsTaskRunner,
          getGitDiffs: vi.fn().mockResolvedValue(undefined),
          getGitLogs: vi.fn().mockResolvedValue(undefined),
          prefetchSortData: vi.fn().mockResolvedValue(undefined),
          sortOutputFiles: vi.fn().mockImplementation((files) => files),
        },
      };
    };

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

    test('cleans up the metrics worker pool even when the warmup promise rejects', async () => {
      const { deps } = baseDeps();
      // Pre-attach a no-op handler so the rejection is observed at construction time,
      // before pack() reaches `await metricsWarmupPromise`. Production code mirrors this
      // with `.catch(() => {})` in packager.ts:262, so the warmup rejection is fully
      // contained — but vitest's unhandled-rejection detector can flag it eagerly here.
      const warmupPromise = Promise.reject(new Error('warmup failed'));
      warmupPromise.catch(() => {});
      const metricsTaskRunner = createMetricsTaskRunnerDouble({ warmupPromise });
      deps.createMetricsTaskRunner = metricsTaskRunner.createMetricsTaskRunner;

      await expect(pack(['root'], createMockConfig(), vi.fn(), deps)).rejects.toThrow('warmup failed');

      expect(metricsTaskRunner.taskRunner.cleanup).toHaveBeenCalled();
    });

    describe('cancellation', () => {
      const packWithSignal = (deps: ReturnType<typeof baseDeps>['deps'], signal: AbortSignal) =>
        pack(['root'], createMockConfig(), vi.fn(), deps, undefined, { signal });

      test('rejects without doing any work when the signal is already aborted', async () => {
        const { deps } = baseDeps();
        const controller = new AbortController();
        controller.abort();

        await expect(packWithSignal(deps, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });

        expect(deps.searchFiles).not.toHaveBeenCalled();
        expect(deps.createMetricsTaskRunner).not.toHaveBeenCalled();
      });

      test('stops at the next phase boundary when aborted mid-run', async () => {
        const { cleanup, deps } = baseDeps();
        const controller = new AbortController();
        deps.collectFiles = vi.fn().mockImplementation(async () => {
          controller.abort();
          return { rawFiles: mockRawFiles, skippedFiles: [] };
        });

        await expect(packWithSignal(deps, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });

        expect(deps.validateFileSafety).not.toHaveBeenCalled();
        expect(deps.processFiles).not.toHaveBeenCalled();
        expect(deps.produceOutput).not.toHaveBeenCalled();
        expect(cleanup).toHaveBeenCalled();
      });

      test('passes the signal to the worker-backed phases and surfaces the abort reason', async () => {
        const { deps } = baseDeps();
        const controller = new AbortController();
        // A destroyed worker pool rejects its tasks with its own error.
        deps.validateFileSafety = vi.fn().mockImplementation(async () => {
          controller.abort();
          throw new Error('Terminating worker thread');
        });

        await expect(packWithSignal(deps, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });

        expect(deps.createMetricsTaskRunner).toHaveBeenCalledWith(['root'], 1, 'o200k_base', controller.signal);
        expect(deps.validateFileSafety).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(Function),
          expect.any(Object),
          undefined,
          undefined,
          undefined,
          controller.signal,
        );
        expect(deps.processFiles).toHaveBeenCalledWith(
          expect.any(Array),
          expect.any(Object),
          expect.any(Function),
          undefined,
          controller.signal,
        );
        expect(deps.produceOutput).not.toHaveBeenCalled();
      });

      test('waits for an in-flight output write before rejecting', async () => {
        const { deps } = baseDeps();
        const controller = new AbortController();
        let outputSettled = false;
        deps.produceOutput = vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          outputSettled = true;
          return { outputForMetrics: 'output' };
        });
        deps.calculateMetrics = vi.fn().mockImplementation(async () => {
          controller.abort();
          throw new Error('Terminating worker thread');
        });

        await expect(packWithSignal(deps, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });

        expect(outputSettled).toBe(true);
      });
    });
  });

  describe('multi-root assembly and skill generation', () => {
    // Paths are POSIX-style on purpose: pack() emits forward-slash display paths on every platform.
    const cwd = '/project';
    const rootA = '/project/packages/a';
    const rootB = '/project/packages/b';

    const createDeps = (searchResults: Record<string, { filePaths: string[]; emptyDirPaths: string[] }>) => {
      const metricsTaskRunner = createMetricsTaskRunnerDouble();
      return {
        cleanup: metricsTaskRunner.taskRunner.cleanup,
        deps: {
          searchFiles: vi.fn().mockImplementation(async (rootDir: string) => searchResults[rootDir]),
          sortPaths: vi.fn().mockImplementation((p) => p),
          collectFiles: vi.fn().mockImplementation(async (filePaths: string[]) => ({
            rawFiles: filePaths.map((filePath) => ({ path: filePath, content: `content of ${filePath}` })),
            skippedFiles: [{ path: 'logo.png', reason: 'binary-extension' as const }],
          })),
          applyFileProcessors: vi.fn().mockImplementation(async (rawFiles) => rawFiles),
          processFiles: vi.fn().mockImplementation(async (rawFiles) => rawFiles),
          validateFileSafety: vi.fn().mockImplementation(async (rawFiles: { path: string }[]) => ({
            safeFilePaths: rawFiles.map((file) => file.path),
            safeRawFiles: rawFiles,
            suspiciousFilesResults: [],
            suspiciousGitDiffResults: [],
            suspiciousGitLogResults: [],
          })),
          produceOutput: vi.fn().mockResolvedValue({ outputForMetrics: 'output' }),
          calculateMetrics: vi.fn().mockResolvedValue({
            totalFiles: 0,
            totalCharacters: 0,
            totalTokens: 0,
            fileCharCounts: {},
            fileTokenCounts: {},
            gitDiffTokenCount: 0,
            gitLogTokenCount: 0,
          }),
          createMetricsTaskRunner: metricsTaskRunner.createMetricsTaskRunner,
          getGitDiffs: vi.fn().mockResolvedValue(undefined),
          getGitLogs: vi.fn().mockResolvedValue(undefined),
          prefetchSortData: vi.fn().mockResolvedValue(undefined),
          sortOutputFiles: vi.fn().mockImplementation((files) => files),
          packSkill: vi.fn(),
        },
      };
    };

    // produceOutput(rootDirs, config, processedFiles, allFilePaths, gitDiff, gitLog, progress, filePathsByRoot, emptyDirPaths)
    const getEmptyDirPathsArg = (produceOutput: ReturnType<typeof vi.fn>) => produceOutput.mock.calls[0][8];

    test('labels empty directories per root and sorts them when includeEmptyDirectories is on', async () => {
      const { deps } = createDeps({
        [rootA]: { filePaths: ['index.ts'], emptyDirPaths: ['z-empty', 'empty'] },
        [rootB]: { filePaths: ['index.ts'], emptyDirPaths: ['empty'] },
      });
      const config = createMockConfig({ cwd, output: { includeEmptyDirectories: true } });

      await pack([rootA, rootB], config, vi.fn(), deps);

      expect(getEmptyDirPathsArg(deps.produceOutput)).toEqual([
        'packages/a/empty',
        'packages/a/z-empty',
        'packages/b/empty',
      ]);
    });

    test('deduplicates empty directories that resolve to the same cwd-relative path', async () => {
      // With cwd-relative paths, `sub/empty` under /project and `empty` under /project/sub are the same directory.
      const { deps } = createDeps({
        [cwd]: { filePaths: [], emptyDirPaths: ['sub/empty'] },
        '/project/sub': { filePaths: [], emptyDirPaths: ['empty'] },
      });
      const config = createMockConfig({
        cwd,
        output: { includeEmptyDirectories: true, filePathStyle: 'cwd-relative' },
      });

      await pack([cwd, '/project/sub'], config, vi.fn(), deps);

      expect(getEmptyDirPathsArg(deps.produceOutput)).toEqual(['sub/empty']);
    });

    test('does not pass empty directories when includeEmptyDirectories is off', async () => {
      const { deps } = createDeps({
        [rootA]: { filePaths: ['index.ts'], emptyDirPaths: ['empty'] },
      });

      await pack([rootA], createMockConfig({ cwd }), vi.fn(), deps);

      expect(getEmptyDirPathsArg(deps.produceOutput)).toBeUndefined();
    });

    test('hands the assembled files to packSkill and skips output and metrics when a skill dir is set', async () => {
      const { cleanup, deps } = createDeps({
        [rootA]: { filePaths: ['index.ts'], emptyDirPaths: [] },
        [rootB]: { filePaths: ['index.ts'], emptyDirPaths: [] },
      });
      const skillResult = { totalFiles: 2 } as Awaited<ReturnType<typeof pack>>;
      deps.packSkill.mockResolvedValue(skillResult);
      const config = createMockConfig({ cwd, skillGenerate: 'my-skill' });
      const options = { skillName: 'my-skill', skillDir: '/out/my-skill' };
      const progressCallback = vi.fn();

      const result = await pack([rootA, rootB], config, progressCallback, deps, undefined, options);

      expect(result).toBe(skillResult);
      expect(deps.packSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          rootDirs: [rootA, rootB],
          config,
          options,
          allFilePaths: ['packages/a/index.ts', 'packages/b/index.ts'],
          processedFiles: [
            expect.objectContaining({ path: 'packages/a/index.ts', content: 'content of index.ts' }),
            expect.objectContaining({ path: 'packages/b/index.ts', content: 'content of index.ts' }),
          ],
          safeFilePaths: ['packages/a/index.ts', 'packages/b/index.ts'],
          skippedFiles: [
            { path: 'packages/a/logo.png', reason: 'binary-extension' },
            { path: 'packages/b/logo.png', reason: 'binary-extension' },
          ],
          progressCallback,
        }),
      );
      expect(deps.produceOutput).not.toHaveBeenCalled();
      expect(deps.calculateMetrics).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalled();
    });

    test('falls through to regular output when skillGenerate is set without a skill dir', async () => {
      const { deps } = createDeps({
        [rootA]: { filePaths: ['index.ts'], emptyDirPaths: [] },
      });

      await pack([rootA], createMockConfig({ cwd, skillGenerate: true }), vi.fn(), deps);

      expect(deps.packSkill).not.toHaveBeenCalled();
      expect(deps.produceOutput).toHaveBeenCalled();
    });
  });
});
