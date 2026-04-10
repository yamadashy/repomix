import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
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
import { METRICS_BATCH_SIZE } from './metrics/calculateSelectiveFileMetrics.js';
import { prefetchFileChangeCounts } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import { createSecurityTaskRunner, type SuspiciousFileResult } from './security/securityCheck.js';
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

// Lazy-load packSkill: skill generation is rare, but the packSkill module
// chain pulls in skill-specific modules (skillSectionGenerators, skillStyle,
// etc.). Deferring this import removes them from the default startup path.
const lazyPackSkill = async (params: PackSkillParams) => {
  const { packSkill } = await import('./skill/packSkill.js');
  return packSkill(params);
};

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
  getGitDiffs,
  getGitLogs,
  packSkill: lazyPackSkill,
  prefetchFileChangeCounts,
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

  // Pre-initialize metrics worker pool so gpt-tokenizer loading overlaps with searchFiles.
  // searchFiles is typically the longest early stage (300-700ms for large repos), giving
  // workers ample time to load BPE data (~250ms each) without competing for I/O with
  // the subsequent file collection phase.
  //
  // We use a pre-search task estimate since the exact file count is unknown at this point.
  // The estimate only affects worker count (via ceil(tasks/tasksPerThread)), not correctness.
  // For splitOutput configs, we use a generous upper-bound estimate to ensure enough workers;
  // for default configs, the file metrics estimate alone ensures adequate scaling.
  // Metrics target count: how many files will be individually tokenized.
  // Token counting now always targets only the top files by size (even when tokenCountTree
  // is enabled), with remaining files estimated via calibrated chars/token ratio.
  const estimatedMetricsFileCount =
    config.output.splitOutput !== undefined
      ? 500 // Generous upper bound for split-output configs; capped by maxWorkerThreads regardless
      : Math.max(config.output.topFilesLength * 10, 50);
  // +3 accounts for: 2 git diff (workTree + staged), 1 git log
  // Output token counting is estimated from calibrated chars/token ratio (no worker tasks needed).
  const estimatedTasks = Math.ceil(estimatedMetricsFileCount / METRICS_BATCH_SIZE) + 3;
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    estimatedTasks,
    config.tokenCount.encoding,
  );

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  // Pre-initialize security worker pool now that searchFiles is complete.
  // Secretlint module loading takes ~200ms per worker; by starting workers here,
  // the loading runs concurrently with collectFiles + git operations (~50ms) and
  // processFiles, so workers are ready or nearly ready when the security check runs.
  // Created after searchFiles (not at pack start) to avoid I/O contention between
  // security worker startup, metrics worker startup, and globby's directory traversal.
  const securityPreWarm = config.security.enableSecurityCheck ? deps.createSecurityTaskRunner() : undefined;

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

  try {
    // Run file collection, git operations, and sort-by-changes prefetch in parallel
    // since they are all independent I/O-bound operations:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // - prefetchFileChangeCounts spawns `git log --name-only` for sortByChanges
    //
    // The prefetch populates the module-level cache in outputSort.ts so that
    // sortOutputFiles (called later inside produceOutput) gets a cache hit
    // instead of spawning a blocking git subprocess on the critical path.
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
      config.output.git?.sortByChanges
        ? deps.prefetchFileChangeCounts(config.cwd, config.output.git.sortByChangesMaxCommits)
        : undefined,
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Start security check immediately — it only needs rawFiles (not processedFiles),
    // uses its own pre-warmed worker pool (secretlint), and shares no mutable state with
    // processFiles or output generation. Starting it here allows it to overlap with
    // processFiles, the remaining metrics worker warmup, and output generation.
    // The pre-warmed security workers (started after searchFiles) have been loading
    // secretlint during collectFiles + git operations, so they are ready or nearly ready.
    const validationPromise = withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(
        rawFiles,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        undefined,
        securityPreWarm?.taskRunner,
      ),
    );

    // Process files — output generation and metrics depend on the result.
    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Skill generation path — needs security results before continuing
    if (config.skillGenerate !== undefined && options.skillDir) {
      const validationResult = await validationPromise;
      const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
        validationResult;
      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      const processedFiles =
        suspiciousPathSet.size > 0
          ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path))
          : allProcessedFiles;

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

    // Don't block on metrics warmup — the worker pool handles task queuing naturally.
    // Warmup tasks (submitted in createMetricsTaskRunner) and real metrics tasks share
    // the same pool; real tasks execute as soon as warmup completes on each worker.
    // This frees output generation and the already-running security check from waiting
    // on the unrelated metrics warmup, saving ~40ms on small-to-medium repos where
    // the warmup outlasts the search+collect+process phases.

    progressCallback('Generating output...');

    // Output generation optimistically uses ALL processed files. In the common case
    // (no suspicious files detected), this is correct and saves time by removing
    // the security check from the critical path. In the rare case where files ARE
    // flagged, we regenerate output and recalculate metrics with filtered files.
    // Note: if copyToClipboard is enabled and suspicious files are found, the clipboard
    // is written twice — first with unfiltered content, then overwritten with filtered
    // content. The final clipboard state is always correct.
    const outputPromise = deps.produceOutput(
      rootDirs,
      config,
      allProcessedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      emptyDirPaths,
    );

    const outputForMetricsPromise = outputPromise.then((r) => r.outputForMetrics);

    const [validationResult, produceOutputResult, metrics] = await Promise.all([
      validationPromise,
      outputPromise,
      withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(
          allProcessedFiles,
          outputForMetricsPromise,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          {
            taskRunner: metricsTaskRunner,
          },
        ),
      ),
    ]);

    // Ensure the background disk write (started in produceOutput) has completed
    // before proceeding. The write ran concurrently with metrics tokenization.
    if (produceOutputResult.pendingWrite) {
      await produceOutputResult.pendingWrite;
    }

    const { outputFiles } = produceOutputResult;
    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    let processedFiles = allProcessedFiles;
    let finalOutputFiles = outputFiles;
    let finalMetrics = metrics;

    // If suspicious files were found, filter them out and regenerate output + metrics.
    // This is rare in practice — most repos have zero suspicious files.
    if (suspiciousFilesResults.length > 0) {
      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      processedFiles = allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path));

      const regeneratedOutputPromise = deps.produceOutput(
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
      const regeneratedOutputForMetrics = regeneratedOutputPromise.then((r) => r.outputForMetrics);

      const [regeneratedOutput, regeneratedMetrics] = await Promise.all([
        regeneratedOutputPromise,
        deps.calculateMetrics(
          processedFiles,
          regeneratedOutputForMetrics,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          {
            taskRunner: metricsTaskRunner,
          },
        ),
      ]);

      if (regeneratedOutput.pendingWrite) {
        await regeneratedOutput.pendingWrite;
      }
      finalOutputFiles = regeneratedOutput.outputFiles;
      finalMetrics = regeneratedMetrics;
    }

    // Create a result object that includes metrics and security results
    const result = {
      ...finalMetrics,
      ...(finalOutputFiles && { outputFiles: finalOutputFiles }),
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
    // Run all cleanup in parallel: warmup promises are already resolved by this point,
    // and the two pool.destroy() calls (metrics + security) are independent.
    // Sequential cleanup was adding ~30-35ms of unnecessary latency.
    await Promise.all([
      metricsWarmupPromise.catch(() => {}),
      metricsTaskRunner.cleanup(),
      securityPreWarm
        ? Promise.all([securityPreWarm.warmupPromise.catch(() => {}), securityPreWarm.taskRunner.cleanup()])
        : undefined,
    ]);
  }
};
