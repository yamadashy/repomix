import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
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
  calculateMetrics,
  createMetricsTaskRunner,
  createSecurityTaskRunner,
  sortPaths,
  prefetchSortData,
  sortOutputFiles,
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
  const estimatedTasks = deps.getProcessConcurrency() * 100;
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    estimatedTasks,
    config.tokenCount.encoding,
  );
  const securityTaskRunnerWithWarmup = securityEnabled ? deps.createSecurityTaskRunner(estimatedTasks) : undefined;

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

    // Deduplicate and sort empty directory paths for reuse during output generation,
    // avoiding a redundant searchFiles call in buildOutputGeneratorContext.
    const emptyDirPaths = config.output.includeEmptyDirectories
      ? [...new Set(searchResultsByDir.flatMap((r) => r.emptyDirPaths))].sort()
      : undefined;

    // Sort file paths
    progressCallback('Sorting files...');
    const allFilePaths = searchResultsByDir.flatMap(({ filePaths }) => filePaths);
    const sortedFilePaths = deps.sortPaths(allFilePaths);

    // Regroup sorted file paths by rootDir using Set for O(1) membership checks
    const filePathSetByDir = new Map(searchResultsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]));
    const sortedFilePathsByDir = rootDirs.map((rootDir) => ({
      rootDir,
      filePaths: sortedFilePaths.filter((filePath) => filePathSetByDir.get(rootDir)?.has(filePath) ?? false),
    }));

    // Run file collection, git operations, and sort-data prefetch in parallel since
    // they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // - sortDataPromise populates the fileChangeCountsCache for sortOutputFiles
    // None depend on each other's results.
    progressCallback('Collecting files...');
    const [collectResults, gitDiffResult, gitLogResult] = await Promise.all([
      withMemoryLogging(
        'Collect Files',
        async () =>
          await Promise.all(
            sortedFilePathsByDir.map(({ rootDir, filePaths }) =>
              deps.collectFiles(filePaths, rootDir, config, progressCallback),
            ),
          ),
      ),
      deps.getGitDiffs(rootDirs, config),
      deps.getGitLogs(rootDirs, config),
      sortDataPromise,
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Ensure security workers are warmed up before dispatching real work
    if (securityTaskRunnerWithWarmup) {
      await securityTaskRunnerWithWarmup.warmupPromise;
    }

    // Run security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    // After both complete, filter out any suspicious files from the processed results.
    const [validationResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, {
          runSecurityCheck,
          filterOutUntrustedFiles,
          securityTaskRunner: securityTaskRunnerWithWarmup?.taskRunner,
        }),
      ),
      withMemoryLogging('Process Files', () => {
        progressCallback('Processing files...');
        return deps.processFiles(rawFiles, config, progressCallback);
      }),
    ]);

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
    const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
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

    const [{ outputFiles }, metrics] = await Promise.all([
      outputPromise,
      withMemoryLogging('Calculate Metrics', async () => {
        // Wait for worker warm-up only before dispatching metrics tasks.
        await metricsWarmupPromise;
        return deps.calculateMetrics(
          processedFiles,
          outputForMetricsPromise,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          {
            taskRunner: metricsTaskRunner,
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
    await metricsWarmupPromise.catch(() => {});
    await metricsTaskRunner.cleanup();
    if (securityTaskRunnerWithWarmup) {
      await securityTaskRunnerWithWarmup.warmupPromise.catch(() => {});
      await securityTaskRunnerWithWarmup.taskRunner.cleanup();
    }
  }
};
