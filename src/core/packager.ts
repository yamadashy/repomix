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
import { prefetchGitFileChangeCounts } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import { createSecurityTaskRunner, type SuspiciousFileResult } from './security/securityCheck.js';
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
  createMetricsTaskRunner,
  createSecurityTaskRunner,
  sortPaths,
  getGitDiffs,
  getGitLogs,
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

  // Pre-initialize metrics worker pool FIRST to maximize warmup overlap.
  // gpt-tokenizer takes ~130ms to load per thread. Starting warmup at the very beginning
  // of pack() ensures it completes before the security phase ends (~288ms from pack start),
  // allowing per-file token counting to overlap with the security check tail.
  // Cap pool to 2 threads (matching warmup count) to avoid cold-start penalty from
  // on-demand thread creation. With 2 warm threads: ~135ms for top-50 file tokenization.
  const METRICS_WARMUP_THREADS = 2;
  const metricsTaskRunner = deps.createMetricsTaskRunner(METRICS_WARMUP_THREADS * 100);
  const metricsWarmupPromise = Promise.all(
    Array.from({ length: METRICS_WARMUP_THREADS }, () =>
      metricsTaskRunner.run({ content: '', encoding: config.tokenCount.encoding }).catch(() => 0),
    ),
  );

  // Pre-initialize security worker pool to overlap @secretlint/core module
  // loading (~103ms cold start per thread) with the file search + sort + collection pipeline
  // (~136ms). Without pre-warming, security module loading happens when the security check
  // stage begins, adding ~103ms to the critical path. Tinypool spawns minThreads=1 at pool
  // creation, which immediately begins loading the worker module in the background.
  // numOfTasks=200 yields maxThreads=2, optimal for balancing module loading cost against
  // scanning throughput.
  const SECURITY_PREWARM_TASKS = 200;
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.createSecurityTaskRunner(SECURITY_PREWARM_TASKS)
    : undefined;

  // Pre-fetch git file change counts for output sorting. This spawns a
  // `git log --name-only` subprocess that overlaps with the file search phase,
  // so the data is cached when sortOutputFiles runs during output generation.
  const gitSortPrefetchPromise = prefetchGitFileChangeCounts(config);
  gitSortPrefetchPromise.catch(() => {}); // Prevent unhandled rejection

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

  try {
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

    // Start security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    const securityPromise = withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, securityTaskRunner),
    );

    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Ensure metrics warm-up completes before starting token counting
    await metricsWarmupPromise;

    // Start metrics calculation immediately, overlapping with the remaining security check.
    // File processing completes in ~42ms while security takes ~223ms; by starting token
    // counting here, ~135ms of metrics work runs during the ~181ms security tail, removing
    // metrics from the critical path entirely.
    // Uses a deferred output promise: per-file tokenization starts now, while the output
    // character count (needed only for the final estimation) arrives after output generation.
    //
    // Note: We pass allProcessedFiles (before security filtering) to calculateMetrics.
    // This means token counts may include suspicious files. In practice, suspicious files
    // are extremely rare (typically 0), and the overestimate is negligible: estimateOutputTokens
    // caps the overhead term at 0 when totalFileChars exceeds totalOutputChars, so only the
    // per-file token counts for suspicious files (~few KB) inflate the total out of ~1M+ tokens.
    let resolveOutputForMetrics!: (value: string | string[]) => void;
    let rejectOutputForMetrics!: (reason: unknown) => void;
    const deferredOutputPromise = new Promise<string | string[]>((resolve, reject) => {
      resolveOutputForMetrics = resolve;
      rejectOutputForMetrics = reject;
    });

    const metricsPromise = withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(
        allProcessedFiles,
        deferredOutputPromise,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        {
          taskRunner: metricsTaskRunner,
        },
      ),
    );
    // Prevent unhandled rejection if security/output fails before metrics completes
    metricsPromise.catch(() => {});

    // Wait for security check to complete
    const validationResult = await securityPromise;

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    // Filter processed files to exclude suspicious ones
    const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
    const processedFiles =
      suspiciousPathSet.size > 0 ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path)) : allProcessedFiles;

    progressCallback('Generating output...');

    // Check if skill generation is requested
    if (config.skillGenerate !== undefined && options.skillDir) {
      // Resolve the deferred output promise so metrics can complete gracefully
      resolveOutputForMetrics('');
      await metricsPromise.catch(() => {});

      // Dynamic import: packSkill depends on Handlebars which adds ~25ms to module loading.
      // Since skill generation is a rarely used feature (--skill-generate flag), deferring
      // this import keeps the default pack() path free of Handlebars overhead.
      const { packSkill: packSkillFn } = await import('./skill/packSkill.js');
      const result = await packSkillFn({
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

    // Generate and write output. Metrics per-file tokenization is already running
    // concurrently (started above). The deferred output promise connects the output
    // character count to the final metrics estimation.
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

    // Connect output to deferred metrics promise: resolves as soon as the output string
    // is generated (BEFORE disk write), unblocking estimateOutputTokens in calculateMetrics.
    // On failure, reject the deferred promise so calculateMetrics doesn't hang.
    outputPromise.then(
      (r) => resolveOutputForMetrics(r.outputForMetrics),
      (err) => rejectOutputForMetrics(err),
    );

    const writeCompletePromise = outputPromise.then((r) => r.writeComplete);
    writeCompletePromise.catch(() => {});

    const [, metrics] = await Promise.all([outputPromise, metricsPromise]);

    // Ensure disk write completes before returning (re-throws if write failed)
    const { outputFiles } = await outputPromise;
    await writeCompletePromise;

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
    // Unref worker threads so they don't prevent the Node.js event loop from draining,
    // then schedule pool cleanup in the background. This avoids ~80ms of synchronous
    // thread termination overhead on the critical path. The cleanup promise still
    // runs but doesn't block the caller. All worker onWorkerTermination hooks are
    // no-ops (gpt-tokenizer is pure JS, secretlint needs no teardown).
    metricsTaskRunner.unref();
    securityTaskRunner?.unref();
    Promise.all([metricsTaskRunner.cleanup(), securityTaskRunner?.cleanup()]).catch(() => {});
  }
};
