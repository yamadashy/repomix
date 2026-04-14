import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { getProcessConcurrency } from '../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateFileMetrics } from './metrics/calculateFileMetrics.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import { filterOutUntrustedFiles } from './security/filterOutUntrustedFiles.js';
import { createSecurityTaskRunner, runSecurityCheck, type SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';
import type { PackSkillParams } from './skill/packSkill.js';

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
  calculateFileMetrics,
  calculateMetrics,
  createMetricsTaskRunner,
  createSecurityTaskRunner,
  sortPaths,
  prefetchSortData,
  sortOutputFiles,
  prefetchSortData,
  getGitDiffs,
  getGitLogs,
  getProcessConcurrency,
  // Lazy-load packSkill to defer importing the skill module chain
  // (skillSectionGenerators, skillStyle → Handlebars), which adds ~25ms
  // to module loading. Only used when --skill-generate is active (non-default).
  packSkill: async (params: PackSkillParams) => {
    const { packSkill } = await import('./skill/packSkill.js');
    return packSkill(params);
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

  // Ensure REPOMIX_LOG_LEVEL is set before worker pools are created so that
  // worker_threads (which inherit process.env) pick up the correct log level.
  // This is a no-op when called via runCli (which sets it earlier), but is
  // necessary when pack() is used as a library without going through the CLI.
  process.env.REPOMIX_LOG_LEVEL ??= String(logger.getLogLevel());

  // Start prefetching git sort data (git log --name-only) immediately so the
  // result is cached by the time sortOutputFiles runs on the critical path.
  // Without this, sortOutputFiles spawns a ~15ms git subprocess that blocks
  // between the security/process phase and the output/metrics phase.
  const sortDataPromise = deps.prefetchSortData(config);

  // Prevent unhandled rejection if an early exit occurs before the Promise.all
  // that awaits sortDataPromise (e.g., searchFiles throws).
  sortDataPromise.catch(() => {});

  const securityEnabled = config.security.enableSecurityCheck;

  // Pre-initialize worker pools BEFORE searchFiles so that warm-up (gpt-tokenizer
  // ~150ms, secretlint ~97ms) overlaps with both searchFiles (~135ms) and
  // collectFiles (~20ms with sync I/O). The exact file count is unknown before
  // searchFiles, so we use getProcessConcurrency() × TASKS_PER_THREAD as the
  // task estimate — this guarantees maxThreads = processConcurrency for any repo
  // large enough to benefit from parallelism (≥ 400 files). For smaller repos the
  // extra threads are harmless: they share the same warm-up wall-time and sit idle
  // during the metrics phase if there aren't enough batches to fill them.
  //
  // Pool creation is async (tinypool loaded via dynamic import to avoid blocking
  // the ESM module chain), so fire both pools in parallel alongside git operations
  // and searchFiles — the tinypool module is already cached from the preload
  // started during module evaluation, so the await resolves near-instantly.
  const estimatedTasks = deps.getProcessConcurrency() * 100;
  const metricsTaskRunnerPromise = deps.createMetricsTaskRunner(estimatedTasks, config.tokenCount.encoding);
  const securityTaskRunnerPromise = securityEnabled ? deps.createSecurityTaskRunner(estimatedTasks) : undefined;

  // Start git operations immediately — they only need rootDirs and config, not
  // searchFiles results. Launching them here overlaps the ~50-70ms git diff/log
  // subprocesses with searchFiles (~135ms) and worker warm-up, hiding their cost
  // entirely. Previously they started after searchFiles inside the collectFiles
  // Promise.all, extending the critical path by up to 70ms when git operations
  // took longer than file collection.
  const gitDiffPromise = deps.getGitDiffs(rootDirs, config);
  const gitLogPromise = deps.getGitLogs(rootDirs, config);
  // Prevent unhandled rejections if searchFiles throws before we await these
  gitDiffPromise?.catch?.(() => {});
  gitLogPromise?.catch?.(() => {});
  metricsTaskRunnerPromise.catch(() => {});
  securityTaskRunnerPromise?.catch(() => {});

  try {
    progressCallback('Searching for files...');
    const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
      Promise.all(
        rootDirs.map(async (rootDir) => {
          const result = await deps.searchFiles(rootDir, config, explicitFiles);
          return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
        }),
      ),
    );

    // Resolve pool creation promises — they ran in parallel with searchFiles and
    // are typically already settled (tinypool was pre-loaded during module evaluation).
    const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = await metricsTaskRunnerPromise;
    const securityTaskRunnerWithWarmup = await (securityTaskRunnerPromise ?? Promise.resolve(undefined));

    // Deduplicate and sort empty directory paths for reuse during output generation,
    // avoiding a redundant searchFiles call in buildOutputGeneratorContext.
    const emptyDirPaths = config.output.includeEmptyDirectories
      ? [...new Set(searchResultsByDir.flatMap((r) => r.emptyDirPaths))].sort()
      : undefined;

    const allFilePaths = searchResultsByDir.flatMap(({ filePaths }) => filePaths);

    // For a single root (the common case), searchFiles already returned sorted
    // paths, so re-sorting + Set-based regrouping (~11 ms) is pure overhead.
    // For multiple roots, we need to merge-sort across roots for deterministic
    // ordering and regroup the sorted paths back to their respective roots.
    let filePathsByDir: { rootDir: string; filePaths: string[] }[];
    if (rootDirs.length === 1) {
      filePathsByDir = searchResultsByDir;
    } else {
      progressCallback('Sorting files...');
      const sortedFilePaths = deps.sortPaths(allFilePaths);
      const filePathSetByDir = new Map(
        searchResultsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]),
      );
      filePathsByDir = rootDirs.map((rootDir) => ({
        rootDir,
        filePaths: sortedFilePaths.filter((filePath) => filePathSetByDir.get(rootDir)?.has(filePath) ?? false),
      }));
    }

    // Run file collection and await pre-started git operations in parallel.
    // collectFiles reads file contents from disk; getGitDiffs/getGitLogs were
    // started before searchFiles (see above) so their subprocesses have been
    // running concurrently with the search and are likely already resolved.
    progressCallback('Collecting files...');
    const [collectResults, gitDiffResult, gitLogResult] = await Promise.all([
      withMemoryLogging(
        'Collect Files',
        async () =>
          await Promise.all(
            filePathsByDir.map(({ rootDir, filePaths }) =>
              deps.collectFiles(filePaths, rootDir, config, progressCallback),
            ),
          ),
      ),
      gitDiffPromise,
      gitLogPromise,
      sortDataPromise,
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Process files on the main thread first (lightweight: truncateBase64 + trim,
    // ~1-15ms), then immediately dispatch per-file token counting to metrics workers
    // BEFORE the security check completes. This overlaps ~50ms of metrics worker
    // computation with the remaining security check, since they use separate worker
    // pools and don't compete for CPU. Any files later marked suspicious by the
    // security check are filtered from the metrics results.
    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Dispatch file metrics batches without waiting for the metrics warmup to
    // complete. Tinypool queues tasks FIFO per worker — each batch sits behind
    // its worker's warmup task and starts as soon as that worker's gpt-tokenizer
    // load finishes. This avoids a main-thread stall where fast workers idle
    // while the slowest worker is still warming up.
    //
    // Start per-file token counting immediately — this is the most expensive
    // single operation in the pipeline (~400ms). Starting it here instead of
    // after the security check allows the first ~50ms of token counting to
    // overlap with the remaining security check.
    const allFileMetricsPromise = deps.calculateFileMetrics(
      allProcessedFiles,
      allProcessedFiles.map((f) => f.path),
      config.tokenCount.encoding,
      progressCallback,
      { taskRunner: metricsTaskRunner },
    );
    // Prevent unhandled rejection if security throws before we await this
    allFileMetricsPromise.catch(() => {});

    // Ensure security workers are warmed up, then run security check concurrently
    // with the already-running file metrics workers
    if (securityTaskRunnerWithWarmup) {
      await securityTaskRunnerWithWarmup.warmupPromise;
    }

    const validationResult = await withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, {
        runSecurityCheck,
        filterOutUntrustedFiles,
        securityTaskRunner: securityTaskRunnerWithWarmup?.taskRunner,
      }),
    );

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    // Filter processed files to exclude suspicious ones
    const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
    const filteredProcessedFiles =
      suspiciousPathSet.size > 0 ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path)) : allProcessedFiles;

    // Pre-sort processedFiles in the same order they will appear in the generated output.
    // `generateOutput` internally calls `sortOutputFiles` as well; both share the same
    // git-log subprocess result (cached via `fileChangeCountsCache`). The array sort itself
    // runs twice but is negligible (~1ms for 1000 files). This ordering is required by the
    // fast-path in `calculateMetrics`, which walks file contents through the output string
    // in order via `extractOutputWrapper`.
    await sortDataPromise;
    const processedFiles = await deps.sortOutputFiles(filteredProcessedFiles, config);

    progressCallback('Generating output...');

    // Skill generation path — metrics not needed, return early (worker pool cleaned up by finally)
    if (config.skillGenerate !== undefined && options.skillDir) {
      const result = await deps.packSkill({
        rootDirs,
        config,
        options,
        processedFiles,
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

    // Build filePathsByRoot for multi-root tree generation
    // Use directory basename as the label for each root
    // Fallback to rootDir if basename is empty (e.g., filesystem root "/")
    const filePathsByRoot: FilesByRoot[] = filePathsByDir.map(({ rootDir, filePaths }) => ({
      rootLabel: path.basename(rootDir) || rootDir,
      files: filePaths,
    }));

    // Start output generation immediately — it does not need the metrics
    // worker pool.  The metrics warmup promise is awaited inside the metrics
    // branch only, so that output generation (lazy module import + XML string
    // concat + disk write) can overlap with any remaining worker warm-up
    // instead of stalling behind it.
    const outputPromise = deps.produceOutput(
      rootDirs,
      config,
      processedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      emptyDirPaths,
    );

    const outputForMetricsPromise = outputPromise.then((r) => r.outputForMetrics);

    // Extract pendingIO separately so we can await it even if Promise.all rejects.
    // The .catch(() => {}) in produceOutput prevents unhandled rejections, but we
    // still want to surface the error if we do reach the await.
    const pendingIOPromise = outputPromise.then((r) => r.pendingIO);
    pendingIOPromise.catch(() => {});

    // Pass the early-started file metrics promise to calculateMetrics so it can
    // continue running concurrently with output generation. The suspicious file
    // filtering is done inside calculateMetrics when the promise resolves.
    const [{ outputFiles }, metrics] = await Promise.all([
      outputPromise,
      withMemoryLogging('Calculate Metrics', async () => {
        return deps.calculateMetrics(
          processedFiles,
          outputForMetricsPromise,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          {
            taskRunner: metricsTaskRunner,
            precomputedFileMetrics: allFileMetricsPromise,
            suspiciousPathSet,
          },
        );
      }),
    ]);

    // Ensure disk write + clipboard copy completed before returning.
    // The I/O ran in the background while metrics were being calculated.
    const pendingIO = await pendingIOPromise;
    if (pendingIO) {
      await pendingIO;
    }

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
  } finally {
    // Cleanup pools — resolve the creation promises directly (they may not have
    // been awaited if searchFiles threw before reaching the resolution point).
    try {
      const { taskRunner, warmupPromise } = await metricsTaskRunnerPromise;
      await warmupPromise.catch(() => {});
      await taskRunner.cleanup();
    } catch {
      // Pool creation failed — nothing to clean up
    }
    if (securityTaskRunnerPromise) {
      try {
        const secRunner = await securityTaskRunnerPromise;
        await secRunner.warmupPromise.catch(() => {});
        await secRunner.taskRunner.cleanup();
      } catch {
        // Pool creation failed — nothing to clean up
      }
    }
  }
};
