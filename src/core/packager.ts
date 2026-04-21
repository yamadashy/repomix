import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
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
import { METRICS_POOL_SIZING_ESTIMATE } from './metrics/metricsPoolConfig.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
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

  // Pools are declared here and assigned inside the `try` so that a throw from
  // either `createXxxTaskRunner` constructor (e.g. Tinypool failing to spawn a
  // worker) still hits the `finally` block and disposes of whichever pool was
  // successfully created.
  let metricsTaskRunner: Awaited<ReturnType<typeof deps.createMetricsTaskRunner>>['taskRunner'] | null = null;
  let metricsWarmupPromise: Awaited<ReturnType<typeof deps.createMetricsTaskRunner>>['warmupPromise'] | null = null;
  let securityRunnerWithWarmup: ReturnType<typeof deps.createSecurityTaskRunner> | null = null;

  try {
    // Pre-initialize the metrics worker pool BEFORE searchFiles to maximise warmup overlap.
    // Previously, warmup began after searchFiles + sortPaths and its ~500ms gpt-tokenizer
    // BPE load still blocked the later `await metricsWarmupPromise` for ~250ms on the
    // critical path. Launching here lets that load overlap with searchFiles, security
    // check, fileProcess, and sortOutputFiles, collapsing the later await to a near no-op.
    //
    // `numOfTasks=400` is a fixed estimate (actual file count is not yet known) — with
    // TASKS_PER_THREAD=100 in processConcurrency.ts this maps to `maxThreads=4` on machines
    // with ≥4 logical CPUs (capped at `availableParallelism` on smaller hosts, so a
    // 2-CPU runner still gets 2 workers). Two workers leave one tokenizer fully blocked
    // by the ~600ms git-log token count whenever `output.git.includeLogs` is enabled,
    // starving file-metrics batches of parallelism. Bumping to four lets the git-log task
    // own one tokenizer while the remaining three drain the file-metrics queue, halving
    // the metrics-phase wall time. The pool is reused by `calculateMetrics` (which does
    // not re-create it), so this is the final thread cap.
    ({ taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
      METRICS_POOL_SIZING_ESTIMATE,
      config.tokenCount.encoding,
    ));

    // Pre-initialize the security worker pool for the same reason as the metrics warmup:
    // `@secretlint/core` + its recommended rule preset take ~150ms to load inside the
    // worker, and without a pre-warmup that load sits on the critical path between
    // `collectFiles` and the security result. Launching here lets secretlint load in
    // parallel with searchFiles, collectFiles, and processFiles. Skipped when the user
    // disables the security check so `--no-security-check` pays none of this cost.
    //
    // `numOfTasks=400` matches the cap `runSecurityCheck` applies internally
    // (`MAX_SECURITY_WORKERS=4`): with TASKS_PER_THREAD=100 this maps to `maxThreads=4` on
    // machines with ≥4 logical CPUs (capped at `availableParallelism` on smaller hosts, so
    // a 2-CPU runner still gets 2 workers). Going from 2 to 4 workers roughly halves the
    // secretlint wall time for a ~1000-file repo; the security pool runs during Phase 3
    // while the metrics pool is idle, so the extra threads cost nothing.
    if (config.security.enableSecurityCheck) {
      securityRunnerWithWarmup = deps.createSecurityTaskRunner(400);
    }

    // Pre-fetch git file-change counts for sortOutputFiles while search and
    // collection are in flight, so the later sortOutputFiles call is a cache hit.
    const sortDataPromise = deps.prefetchSortData(config).catch((error) => {
      logger.trace('Failed to prefetch sort data:', error);
    });

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
          securityTaskRunner: securityRunnerWithWarmup?.taskRunner,
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
            // Non-null: if the pool constructor had failed, the throw would
            // have bypassed this point and gone straight to `finally`.
            // biome-ignore lint/style/noNonNullAssertion: see comment above
            taskRunner: metricsTaskRunner!,
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
    // Null checks guard against `createXxxTaskRunner` having thrown before
    // assignment — in that case there's nothing to await or dispose.
    if (metricsWarmupPromise) {
      await metricsWarmupPromise.catch(() => {});
    }
    if (metricsTaskRunner) {
      await metricsTaskRunner.cleanup();
    }
    if (securityRunnerWithWarmup) {
      await securityRunnerWithWarmup.warmupPromise.catch(() => {});
      await securityRunnerWithWarmup.taskRunner.cleanup();
    }
  }
};
