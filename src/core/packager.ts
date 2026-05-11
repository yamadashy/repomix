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
import { loadTokenCountCache, saveTokenCountCache, tokenCountCacheFileExists } from './metrics/tokenCountCache.js';
import { prefetchCompiledTemplate } from './output/outputGenerate.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import {
  createSecurityTaskRunner,
  type SecurityTaskRunnerWithWarmup,
  type SuspiciousFileResult,
} from './security/securityCheck.js';
import { loadSecurityCheckCache, saveSecurityCheckCache } from './security/securityCheckCache.js';
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
  tokenCountCacheFileExists,
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

  // Start loading the token-count disk cache in the background so it is ready
  // before calculateFileMetrics runs (~794 ms into the pipeline). The load
  // itself takes only ~1 ms (50 KB JSON), but kicking it off here ensures it
  // overlaps with file search and collection rather than blocking metrics.
  const tokenCacheLoadPromise = loadTokenCountCache();

  // Start loading the security-check disk cache so it is ready before
  // validateFileSafety runs. Same pattern as the token-count cache: the
  // load takes ~1–3 ms and overlaps with file search and collection.
  const securityCacheLoadPromise = config.security.enableSecurityCheck ? loadSecurityCheckCache() : Promise.resolve();

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
  // is long enough to amortize its ~250ms BPE warm-up. We size on two coarse
  // proxies for "long metrics phase":
  //
  // 1. `hasExplicitScope` — whether the user constrained the file set via
  //    --include / config.include / --stdin (explicitFiles). Explicit scopes
  //    typically pack a few hundred files; the metrics phase is short and
  //    the 3rd worker's BPE warm-up dominates the parallelism gain (-11.85%
  //    paired regression on the 258-file `--include 'src,tests'` workload).
  //
  // 2. `tokenCountCacheFileExists()` — whether the persistent disk cache
  //    exists from a previous run. When present, almost every per-file token
  //    count is served from cache and `calculateFileMetrics` returns without
  //    dispatching any worker tasks (see `calculateFileMetrics.ts`); the only
  //    real worker work that survives is the small fixed set of dispatches
  //    that happen unconditionally — wrapper-token (cache-hit after run #2),
  //    git diff staged/worktree, and git log when the user opts in via
  //    `output.git.includeDiffs`/`includeLogs`. That worst case fits one
  //    worker handling 2–3 short tasks serially in <30 ms.
  //    On warm-cache repeat runs (the common case), spawning 3 workers means
  //    3 redundant BPE table parses (~340 ms of pure CPU each); even though
  //    those parses overlap with file collection (~325 ms), the extra two
  //    cores worth of CPU contention slows the main-thread file-collect
  //    pipeline AND the post-pipeline `pool.destroy()` blocks waiting for
  //    BPE-loaded workers to terminate (~21 ms each vs ~3 ms for an idle
  //    worker). Reducing to 1 warm worker on the warm-cache path measured
  //    -86.7 ms / -8.88% paired wall-clock on the 1068-file repomix
  //    self-pack workload (n=12, t=7.39, faster=12/12).
  //    Cold-cache (cache file missing) keeps the original 3-worker warmup
  //    so the actual file tokenizations parallelise across more workers.
  //    The probe is a coarse heuristic: a cache file written by a previous
  //    run that used a different `tokenCount.encoding` (e.g. cl100k_base
  //    rather than the default o200k_base) yields no hits for the current
  //    run, so the metrics phase will be cold-but-with-1-worker — the BPE
  //    parse pays sequentially on the main critical path before tokenizing
  //    files, a one-time cost on the encoding switch (subsequent runs
  //    rebuild the cache for the new encoding and hit again).
  //
  // EAGER_WARMUP_THREADS × TASKS_PER_THREAD yields maxThreads=min(cpuCount, N)
  // for N ∈ {1, 2, 3}; single-CPU hosts collapse to maxThreads=1 (no change).
  //
  // When the persistent token-count cache file is present from a previous run
  // we skip the eager pool creation entirely: with per-file token counts,
  // the output-wrapper count, and git log / git diff counts all served from
  // the in-memory cache (see calculateFileMetrics, calculateMetrics,
  // calculateGitLogMetrics, calculateGitDiffMetrics), no worker task is
  // dispatched on the warm-cache path. Creating the pool here would pay a
  // ~340 ms BPE warmup task (parallel, but contends with file collection on
  // the main thread) and ~12 ms of BPE-loaded `pool.destroy()` on the
  // critical path before pack() returns. Leaving metricsTaskRunner=undefined
  // lets calculateMetrics lazily create a non-warmed pool only if some content
  // actually misses the cache — the rare-write case pays the BPE-init cost
  // once instead of every run.
  const hasExplicitScope = (explicitFiles?.length ?? 0) > 0 || config.include.length > 0;
  const cacheLikelyWarm = deps.tokenCountCacheFileExists();

  let metricsTaskRunner: ReturnType<typeof deps.createMetricsTaskRunner>['taskRunner'] | undefined;
  let metricsWarmupPromise: Promise<unknown> = Promise.resolve();
  if (!cacheLikelyWarm) {
    const EAGER_WARMUP_THREADS = hasExplicitScope ? 2 : 3;
    const EAGER_METRICS_NUM_TASKS = EAGER_WARMUP_THREADS * TASKS_PER_THREAD;
    const created = deps.createMetricsTaskRunner(EAGER_METRICS_NUM_TASKS, config.tokenCount.encoding);
    metricsTaskRunner = created.taskRunner;
    metricsWarmupPromise = created.warmupPromise;
  }

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

    // Kick off Handlebars + style-template loading in the background so the
    // compiled template is ready (cache hit) when generateHandlebarOutput runs.
    // This overlaps the ~50 ms load with the collectFiles + security-check phase.
    prefetchCompiledTemplate(config.output.style);

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

    // Ensure the security-check disk cache is loaded before validateFileSafety
    // probes it. The load was started at t=0 and almost always finishes long
    // before this point; the explicit await prevents a race on very fast hosts.
    await securityCacheLoadPromise;

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
    // Ensure the token-count cache is loaded before calculateFileMetrics reads it.
    // The load started at t=0 and completes in <1ms, so this is almost always
    // a no-op, but the explicit await prevents a subtle race on very fast machines.
    await tokenCacheLoadPromise;

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

    // Persist the token-count cache for future runs (fire-and-forget).
    // Errors are silently swallowed inside saveTokenCountCache.
    saveTokenCountCache().catch(() => {});

    // Persist the security-check cache for future runs (fire-and-forget).
    // Only writes when there are dirty entries from new misses on this run.
    saveSecurityCheckCache().catch(() => {});

    return result;
  } finally {
    await metricsWarmupPromise.catch(() => {});
    if (metricsTaskRunner) {
      await metricsTaskRunner.cleanup();
    }
    if (securityTaskRunnerWithWarmup) {
      await securityTaskRunnerWithWarmup.warmupPromise.catch(() => {});
      await securityTaskRunnerWithWarmup.taskRunner.cleanup();
    }
  }
};
