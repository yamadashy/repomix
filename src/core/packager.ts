import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { preWarmBinaryDetection } from './file/fileRead.js';
import { searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile, RawFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateMetrics, getMetricsTargetPaths } from './metrics/calculateMetrics.js';
import { calculateSelectiveFileMetrics } from './metrics/calculateSelectiveFileMetrics.js';
import { prefetchFileChangeCounts, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import type { SecurityTaskRunner, SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';

export interface PackResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
  outputFiles?: string[];
  suspiciousFilesResults: SuspiciousFileResult[];
  suspiciousGitDiffResults: SuspiciousFileResult[];
  suspiciousGitLogResults: SuspiciousFileResult[];
  processedFiles: ProcessedFile[];
  safeFilePaths: string[];
  skippedFiles: SkippedFileInfo[];
}

const defaultDeps = {
  searchFiles,
  collectFiles,
  processFiles,
  validateFileSafety,
  produceOutput,
  calculateMetrics,
  calculateSelectiveFileMetrics,
  getMetricsTargetPaths,
  sortPaths,
  sortOutputFiles,
  prefetchFileChangeCounts,
  getGitDiffs,
  getGitLogs,
  // Pre-warm security worker pool — lazily imports tinypool and creates the pool
  // so workers start loading @secretlint/core while file collection runs.
  // preWarm: true spawns all threads immediately (minThreads = maxThreads),
  // ensuring every thread has time to load @secretlint/core (~150ms) during
  // collectFiles (~180ms), rather than spawning threads on-demand when batches arrive.
  createSecurityWorkerPool: async (numOfTasks: number): Promise<SecurityTaskRunner | undefined> => {
    const { createWorkerPool, cleanupWorkerPool } = await import('../shared/processConcurrency.js');
    const pool = createWorkerPool({
      numOfTasks,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      preWarm: true,
    });
    return {
      run: (task) => pool.run(task) as Promise<(SuspiciousFileResult | null)[]>,
      cleanup: () => cleanupWorkerPool(pool),
    };
  },
  // Pre-warm metrics worker — spawns a worker thread that loads gpt-tokenizer (~288ms)
  // in the background. The BPE table initialization happens off the main thread,
  // so it doesn't block the event loop during file search/collection.
  createMetricsWorkerPool: async (
    encoding: string,
  ): Promise<{ run: (task: unknown) => Promise<unknown>; cleanup: () => Promise<void> }> => {
    const { createWorkerPool, cleanupWorkerPool } = await import('../shared/processConcurrency.js');
    const pool = createWorkerPool({
      numOfTasks: 1,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });
    // Warmup: trigger gpt-tokenizer BPE table loading in the worker
    await pool.run({ batch: true, files: [{ path: '', content: ' ' }], encoding });
    return {
      run: (task: unknown) => pool.run(task),
      cleanup: () => cleanupWorkerPool(pool),
    };
  },
  // Lazy-load packSkill — only needed when --skill-generate is used.
  // Avoids importing skill section generators and their transitive deps on every run.
  packSkill: async (params: Record<string, unknown>) => {
    const { packSkill } = await import('./skill/packSkill.js');
    return packSkill(params as never);
  },
};

export interface PackOptions {
  skillName?: string;
  skillDir?: string;
  skillProjectName?: string;
  skillSourceUrl?: string;
}

export const pack = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  overrideDeps: Partial<typeof defaultDeps> = {},
  explicitFiles?: string[],
  options: PackOptions = {},
): Promise<PackResult> => {
  const deps = {
    ...defaultDeps,
    ...overrideDeps,
  };

  logMemoryUsage('Pack - Start');

  // Start git diffs/logs immediately — they only need rootDirs and config,
  // so they can overlap with file search, sorting, AND file collection
  // instead of just file collection (previously started after search + sort)
  const gitPromise = Promise.all([deps.getGitDiffs(rootDirs, config), deps.getGitLogs(rootDirs, config)]);

  // Pre-fetch git file change counts for output sorting — start the git log subprocess
  // now so it runs in parallel with file search + collection (~110ms). Without this,
  // the subprocess starts after file processing in the parallel block, where it can
  // become the bottleneck when security pre-filter skips most files (~50ms security
  // vs ~100ms git subprocess). Pre-fetching populates the cache in outputSort.ts,
  // so sortOutputFiles later gets a cache hit instead of spawning a new subprocess.
  if (config.output.git?.sortByChanges) {
    deps.prefetchFileChangeCounts(config.cwd, config.output.git?.sortByChangesMaxCommits);
  }

  // Pre-warm metrics worker — spawns a worker thread and loads gpt-tokenizer's BPE
  // encoding table (~288ms) off the main thread. By starting here, the tokenizer
  // initialization overlaps with searchFiles (~150ms) + collectFiles (~180ms).
  // Without this, gpt-tokenizer loads on the main thread during selectiveMetrics,
  // blocking the event loop and causing CPU contention with security workers.
  const metricsWorkerPromise = deps.createMetricsWorkerPool(config.tokenCount.encoding);

  // Pre-warm binary detection modules (is-binary-path + isbinaryfile) during the
  // I/O-bound search phase so they're cached when collectFiles starts reading files.
  // Saves ~10ms of module loading on the first file read.
  preWarmBinaryDetection();

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, pendingEmptyDirPaths: result.pendingEmptyDirPaths };
      }),
    ),
  );

  // Collect deferred empty dir promises — these run in the background during collectFiles,
  // overlapping the ~130ms globby directory scan with the ~300ms file collection phase.
  // On the git-ls-files fast path, filePaths resolve in ~5ms, so collectFiles starts ~125ms
  // sooner than before (when searchFiles blocked on both file search + empty dir detection).
  const emptyDirPathsPromise = Promise.all(
    searchResultsByDir.map((r) => r.pendingEmptyDirPaths).filter((p): p is Promise<string[]> => p !== undefined),
  ).then((results) => results.flat());
  const filePathsByDir = searchResultsByDir.map(({ rootDir, filePaths }) => ({ rootDir, filePaths }));

  // Sort file paths
  progressCallback('Sorting files...');

  let allFilePaths: string[];
  let sortedFilePathsByDir: { rootDir: string; filePaths: string[] }[];

  if (rootDirs.length === 1) {
    // Single root: files are already sorted by searchFiles, skip redundant re-sort.
    // This avoids decorate-sort-undecorate overhead (~5-10ms for 1000 files).
    allFilePaths = filePathsByDir[0].filePaths;
    sortedFilePathsByDir = [{ rootDir: rootDirs[0], filePaths: allFilePaths }];
  } else {
    // Multiple roots: combine and re-sort across all roots
    allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
    const sortedFilePaths = deps.sortPaths(allFilePaths);

    // Regroup sorted file paths by rootDir in a single O(n) pass.
    // Build a path→rootDir lookup, then iterate sortedFilePaths once to bucket them.
    const pathToRootDir = new Map<string, string>();
    for (const { rootDir, filePaths } of filePathsByDir) {
      for (const fp of filePaths) {
        pathToRootDir.set(fp, rootDir);
      }
    }
    const bucketsByRoot = new Map<string, string[]>(rootDirs.map((rd) => [rd, []]));
    for (const fp of sortedFilePaths) {
      const rd = pathToRootDir.get(fp);
      if (rd) {
        bucketsByRoot.get(rd)?.push(fp);
      }
    }
    sortedFilePathsByDir = rootDirs.map((rootDir) => ({
      rootDir,
      filePaths: bucketsByRoot.get(rootDir) ?? [],
    }));
    allFilePaths = sortedFilePaths;
  }

  // Build filePathsByRoot for multi-root tree generation
  const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
    rootLabel: path.basename(rootDir) || rootDir,
    files: filePaths,
  }));

  progressCallback('Collecting files and git info...');

  // Pre-warm security worker pool with a SINGLE thread only.
  // The contentMayContainSecret pre-filter (optimization #25) skips 95-99% of files,
  // so only a handful of files (~5) typically need actual security checking.
  // Previously we spawned up to N threads (N = CPU cores) all loading @secretlint/core,
  // causing significant CPU contention with the main thread during collectFiles.
  // A single pre-warmed thread is sufficient for the typical workload and reduces
  // contention by (N-1) * ~150ms of unnecessary @secretlint/core loading.
  const securityPoolPromise = config.security.enableSecurityCheck ? deps.createSecurityWorkerPool(1) : undefined;

  const collectResults = await withMemoryLogging(
    'Collect Files',
    async () =>
      await Promise.all(
        sortedFilePathsByDir.map(({ rootDir, filePaths }) =>
          deps.collectFiles(filePaths, rootDir, config, progressCallback),
        ),
      ),
  );

  // Single-pass extraction instead of two separate flatMap traversals
  const rawFiles: RawFile[] = [];
  const allSkippedFiles: SkippedFileInfo[] = [];
  for (const curr of collectResults) {
    for (const rf of curr.rawFiles) rawFiles.push(rf);
    for (const sf of curr.skippedFiles) allSkippedFiles.push(sf);
  }

  const [gitDiffResult, gitLogResult] = await gitPromise;

  // Run security check, file processing, file metrics, and git-based sorting in parallel.
  // Pool awaits are deferred INTO the parallel block instead of before it: the security pool
  // (~200ms warmup) and metrics pool (~290ms warmup) may still be initializing, but their
  // remaining warmup time overlaps with useful work in the other branch. This eliminates
  // ~80-180ms of idle time where the main thread previously blocked waiting for pools.
  //
  // Security branch: awaits security pool, then runs security check in worker threads.
  // Main branch: runs processFiles immediately (~5ms), starts sort (I/O-bound git subprocess),
  //   then awaits metrics pool (warmup hidden behind security check time), starts token counting.
  progressCallback('Running security check...');
  let resolvedMetricsWorkerPool: { run: (task: unknown) => Promise<unknown>; cleanup: () => Promise<void> } | undefined;
  const [securityResult, processedSortedAndMetrics] = await Promise.all([
    (async () => {
      const preCreatedSecurityRunner = securityPoolPromise ? await securityPoolPromise : undefined;
      return withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(
          rawFiles,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          undefined,
          preCreatedSecurityRunner,
        ),
      );
    })(),
    withMemoryLogging('Process Files', () => deps.processFiles(rawFiles, config, progressCallback)).then(
      async (allProcessedFiles) => {
        // Chain: after processing completes, start sorting immediately (doesn't need metrics pool).
        // Then await metrics pool (may still be warming up — hidden behind security check time)
        // and start token counting. Both complete well before the security check finishes.
        const metricsTargetPaths = deps.getMetricsTargetPaths(allProcessedFiles, config);
        // Start sort immediately — uses git subprocess (I/O-bound), doesn't need metrics pool
        const sortPromise = deps.sortOutputFiles(allProcessedFiles, config);
        // Await metrics pool — remaining warmup time overlaps with sort + security check
        const metricsWorkerPool = await metricsWorkerPromise;
        resolvedMetricsWorkerPool = metricsWorkerPool;
        const [sortedFiles, fileMetrics] = await Promise.all([
          sortPromise,
          deps.calculateSelectiveFileMetrics(
            allProcessedFiles,
            metricsTargetPaths,
            config.tokenCount.encoding,
            progressCallback,
            undefined,
            metricsWorkerPool,
          ),
        ]);
        return { allProcessedFiles, sortedFiles, fileMetrics };
      },
    ),
  ]);
  const {
    allProcessedFiles,
    sortedFiles: sortedAllFiles,
    fileMetrics: precomputedFileMetrics,
  } = processedSortedAndMetrics;

  const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } = securityResult;

  // Filter sorted files to only include safe ones.
  // Filtering a sorted array preserves the sort order, so no re-sort needed.
  // Create the Set once and reuse for both filters (previously created twice).
  let processedFiles: ProcessedFile[];
  let sortedProcessedFiles: ProcessedFile[];
  if (suspiciousFilesResults.length > 0) {
    const safePathSet = new Set(safeFilePaths);
    processedFiles = allProcessedFiles.filter((file) => safePathSet.has(file.path));
    sortedProcessedFiles = sortedAllFiles.filter((file) => safePathSet.has(file.path));
  } else {
    processedFiles = allProcessedFiles;
    sortedProcessedFiles = sortedAllFiles;
  }

  progressCallback('Generating output...');

  // Await deferred empty dir paths — by now they've been computing in the background
  // during collectFiles + security check, so this resolves instantly (or near-instantly).
  const emptyDirPaths = await emptyDirPathsPromise;

  // Check if skill generation is requested
  if (config.skillGenerate !== undefined && options.skillDir) {
    const result = await deps.packSkill({
      rootDirs,
      config,
      options,
      processedFiles: sortedProcessedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      suspiciousFilesResults,
      suspiciousGitDiffResults,
      suspiciousGitLogResults,
      safeFilePaths,
      skippedFiles: allSkippedFiles,
      progressCallback,
    });

    logMemoryUsage('Pack - End');
    return result;
  }

  // Generate output and start writing to disk (write returned as a promise
  // so we can overlap metrics computation with I/O)
  const { outputFiles, outputForMetrics, writePromise } = await deps.produceOutput(
    rootDirs,
    config,
    sortedProcessedFiles,
    allFilePaths,
    gitDiffResult,
    gitLogResult,
    progressCallback,
    filePathsByRoot,
    emptyDirPaths,
  );

  // File metrics were already computed during the security check phase (overlapped).
  // Now only output/git token counting remains, which overlaps with disk write.
  const [metrics] = await Promise.all([
    withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(
        processedFiles,
        outputForMetrics,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        precomputedFileMetrics,
      ),
    ),
    writePromise,
  ]);

  // Fire-and-forget cleanup of metrics worker pool — workers terminate on process exit anyway
  resolvedMetricsWorkerPool?.cleanup().catch(() => {});

  // Create a result object that includes metrics and security results
  const result = {
    ...metrics,
    ...(outputFiles && { outputFiles }),
    suspiciousFilesResults,
    suspiciousGitDiffResults,
    suspiciousGitLogResults,
    processedFiles,
    safeFilePaths,
    skippedFiles: allSkippedFiles,
  };

  logMemoryUsage('Pack - End');

  return result;
};
