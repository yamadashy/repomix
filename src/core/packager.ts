import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { TASKS_PER_THREAD } from '../shared/processConcurrency.js';
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
import {
  createSecurityTaskRunner,
  type SecurityTaskRunnerWithWarmup,
  type SuspiciousFileResult,
} from './security/securityCheck.js';
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
  sortOutputFiles,
  prefetchSortData,
  getGitDiffs,
  getGitLogs,
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

  // Pre-fetch git file-change counts for sortOutputFiles while search and
  // collection are in flight, so the later sortOutputFiles call is a cache hit.
  const sortDataPromise = deps.prefetchSortData(config).catch((error) => {
    logger.trace('Failed to prefetch sort data:', error);
  });

  // Start the metrics worker pool warm-up before searchFiles so that gpt-tokenizer
  // BPE table loading (~250ms per worker) overlaps with the file-system glob scan
  // (~130ms) in addition to the later security-check and file-processing phases.
  // Without this, the residual `await metricsWarmupPromise` stall before
  // calculateMetrics adds ~130ms to wall-clock for small/medium repos.
  //
  // We don't yet know the file count. Pool maxThreads is fixed at construction
  // in Tinypool, and pre-warming workers we'll use is essential — Tinypool
  // queues tasks for newly spawned (cold) workers and the pipeline can't progress
  // until those workers finish their BPE parse and pick up the queued task
  // (measured: oversizing the pool to maxThreads=cpuCount=4 with only 2 warm
  // workers regressed the 258-file workload by 27% paired).
  //
  // Worker count: the metrics phase wall-clock is dominated by gpt-tokenizer
  // throughput, so adding a 3rd warm worker pays off when the metrics phase
  // is long enough to amortize its ~250ms BPE warm-up. We size on a coarse
  // proxy for "long metrics phase" — whether the user constrained the file
  // set via --include / config.include / --stdin (explicitFiles). When
  // unconstrained (default scan), 3 warm workers measure +2.46% paired mean
  // wall-clock reduction on the 1046-file workload (n=20, t=3.18,
  // NODE_DISABLE_COMPILE_CACHE=1). With an explicit scope the file set is
  // typically a few hundred files, the metrics phase is shorter, and the
  // 3rd worker's BPE warm-up dominates the parallelism gain (-11.85%
  // paired regression on the 258-file `--include 'src,tests'` workload at
  // unconditional EAGER_WARMUP_THREADS=3), so we keep the original
  // 2-worker sizing.
  //
  // EAGER_WARMUP_THREADS × TASKS_PER_THREAD yields maxThreads=min(cpuCount, N)
  // for N ∈ {2, 3}; single-CPU hosts collapse to maxThreads=1 (no change).
  const hasExplicitScope = (explicitFiles?.length ?? 0) > 0 || config.include.length > 0;
  const EAGER_WARMUP_THREADS = hasExplicitScope ? 2 : 3;
  const EAGER_METRICS_NUM_TASKS = EAGER_WARMUP_THREADS * TASKS_PER_THREAD;
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    EAGER_METRICS_NUM_TASKS,
    config.tokenCount.encoding,
  );

  // Declared outside the try block so the finally clause can clean up the pool
  // even if a thrown error occurs after the runner is created but before pack returns.
  let securityTaskRunnerWithWarmup: SecurityTaskRunnerWithWarmup | null = null;

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

    // Pre-warm the security worker pool so its `@secretlint/core` +
    // `@secretlint/secretlint-rule-preset-recommend` module load (~50ms per worker;
    // ~100ms wall-clock for two workers loading concurrently) overlaps with the
    // collectFiles + git ops phase (~200ms) instead of running on the critical path
    // inside `runSecurityCheck`. Without this warm-up the security check phase
    // serially pays the cold-start cost before any scanning begins.
    //
    // Gated on the same `hasExplicitScope` heuristic as the metrics 3-worker bump:
    // when the user narrows the file set via --include / config.include / --stdin
    // the security phase scans only a few hundred files (≤6 batches) and finishes
    // in ~50–80 ms; the saved cold-start cost is small and is outweighed by the
    // up-front cost of creating + destroying a second worker pool (paired t=-4.88,
    // -3.38% regression measured on a 258-file --include 'src,tests' workload).
    // Unconstrained scans run the security check over ~1000+ files where the
    // hidden cold-start dominates the savings (paired t=+5.72, +3.04% improvement
    // on a 1046-file default workload).
    //
    // Skipped when the security check is disabled — no pool is needed and we
    // would otherwise spawn worker threads that never run a real task.
    if (config.security.enableSecurityCheck && !hasExplicitScope) {
      securityTaskRunnerWithWarmup = deps.createSecurityTaskRunner(allFilePaths.length);
    }

    // Run file collection and git operations in parallel since they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // Neither depends on the other's results.
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
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Run security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    // After both complete, filter out any suspicious files from the processed results.
    const [validationResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, {
          taskRunner: securityTaskRunnerWithWarmup?.taskRunner,
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
    const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
      rootLabel: path.basename(rootDir) || rootDir,
      files: filePaths,
    }));

    // Ensure warm-up task completes before metrics calculation
    await metricsWarmupPromise;

    // Generate and write output, overlapping with metrics calculation.
    // File and git metrics don't depend on the output, so they start immediately
    // while output generation runs concurrently.
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

    const [{ outputFiles }, metrics] = await Promise.all([
      outputPromise,
      withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(
          processedFiles,
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
