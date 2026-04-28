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
import { calculateFileMetrics } from './metrics/calculateFileMetrics.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import type { FileMetrics } from './metrics/workers/types.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import type { ProduceOutputResult } from './packager/produceOutput.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
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

// Lazy-load produceOutput to defer importing the output module chain
// (Handlebars + the three style templates, plus fast-xml-builder via the
// parsable XML path). Those modules add ~20-30ms of synchronous evaluation
// to packager.ts's module-load time; deferring them lets the load happen
// during pack()'s first searchFiles I/O await instead of *before* pack()
// starts. The existing packSkill entry below uses the same pattern.
//
// Side benefit: createMetricsTaskRunner runs ~24ms earlier, extending the
// gpt-tokenizer warm-up overlap window across the file-search phase.
const defaultProduceOutput = async (
  ...args: Parameters<typeof import('./packager/produceOutput.js').produceOutput>
): Promise<ProduceOutputResult> => {
  const { produceOutput } = await import('./packager/produceOutput.js');
  return produceOutput(...args);
};

const defaultDeps = {
  searchFiles,
  collectFiles,
  processFiles,
  validateFileSafety,
  produceOutput: defaultProduceOutput,
  calculateMetrics,
  calculateFileMetrics,
  createMetricsTaskRunner,
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

  // Pre-initialize metrics worker pool BEFORE searchFiles to extend the
  // gpt-tokenizer warm-up overlap window across the file-search phase
  // (~100-130ms) in addition to collect/security/process. The pool size is
  // capped (see METRICS_PREWARM_THREAD_CAP) since the file count isn't known
  // yet; for the typical repo this matches the previous file-count-derived cap.
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    config.tokenCount.encoding,
  );

  // Hoisted so the finally block can drain the dispatch before pool cleanup, even on
  // early throws between try-entry and the speculative-dispatch site below. Assigned
  // synchronously once `allProcessedFilesPromise` is constructed.
  let speculativeFileMetricsPromise: Promise<FileMetrics[]> | undefined;

  // Wrap the entire pipeline in try/finally so the worker pool is cleaned up
  // even if searchFiles or any step before file-collection throws.
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
    //
    // processFiles is split out as its own promise so that speculative file-metrics
    // dispatch (below) can begin as soon as processed files are ready, overlapping
    // tokenization with the longer-running security check instead of waiting for it.
    const allProcessedFilesPromise = withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Speculatively dispatch file-metrics tokenization on all processed files (suspicious
    // files are filtered out from the results in calculateMetrics). Tokenization runs in
    // the already-warmed metrics worker pool, in parallel with the security worker pool;
    // both compete for the same physical cores, so per-batch latency rises slightly, but
    // the overall metrics phase finishes earlier because it overlaps with security instead
    // of serializing after it. Measured wall-clock saving on a 4-core box: ~28ms mean /
    // ~30ms median (~2.5%) on a ~1.2s 777-file pack; neutral on smaller (~0.7s) packs.
    // Suspicious files (typically 0 in real repos) cost a negligible amount of extra
    // tokenization that gets discarded.
    const speculativeMetrics = allProcessedFilesPromise.then((files) =>
      deps.calculateFileMetrics(
        files,
        files.map((f) => f.path),
        config.tokenCount.encoding,
        progressCallback,
        { taskRunner: metricsTaskRunner },
      ),
    );
    speculativeFileMetricsPromise = speculativeMetrics;
    // Prevent unhandled rejections if the dispatch errors before calculateMetrics awaits it
    // (e.g., processFiles throws or a worker crashes while validateFileSafety is still running).
    speculativeMetrics.catch(() => {});

    const [validationResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
      ),
      allProcessedFilesPromise,
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

    // Generate and write output, overlapping with metrics calculation.
    // File and git metrics don't depend on the output, so they start immediately
    // while output generation runs concurrently.
    //
    // We do NOT await `metricsWarmupPromise` here. Warm-up tasks were enqueued
    // synchronously inside `createMetricsTaskRunner` (above) into the same Tinypool
    // that the speculative file-metrics dispatch and `calculateMetrics` reuse, and
    // Tinypool dispatches from a single FIFO queue with one task per worker at a
    // time. Any real metrics task enqueued below therefore lands strictly after
    // every warm-up task in queue order, so the first task each worker picks up is
    // a warm-up task that loads gpt-tokenizer; real tasks always run on already-warm
    // workers. Skipping the await lets `produceOutput` (main-thread CPU work) start
    // in parallel with the tail of the warm-up, shaving the produceOutput duration
    // off the critical path when warm-up is the late stage. The `finally` block
    // still awaits the warm-up before cleanup so worker termination stays orderly.
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
            precomputedFileMetricsPromise: speculativeMetrics,
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
    // Await any in-flight speculative metrics dispatch before cleaning up the worker pool,
    // so cleanup observes a quiesced pool. The .catch() above the try block prevents
    // unhandled rejection if the dispatch failed; awaiting here is purely for ordering.
    if (typeof speculativeFileMetricsPromise !== 'undefined') {
      await speculativeFileMetricsPromise.catch(() => {});
    }
    await metricsTaskRunner.cleanup();
  }
};
