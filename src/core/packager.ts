import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { getWorkerThreadCount } from '../shared/processConcurrency.js';
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
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';

// Lazy-loaded to avoid pulling in Handlebars (used by skill templates) during normal pack operations
const lazyPackSkill = async (...args: Parameters<typeof import('./skill/packSkill.js').packSkill>) => {
  const { packSkill } = await import('./skill/packSkill.js');
  return packSkill(...args);
};

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
  getWorkerThreadCount,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  packSkill: lazyPackSkill,
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

  // Pre-initialize metrics worker pool BEFORE search to overlap gpt-tokenizer loading
  // with the I/O-bound file search. Uses an estimated task count since the actual file
  // count isn't known yet; for typical repos (100-2000 files) the thread count calculation
  // yields the same result. Warm ALL threads so the expensive per-thread module load
  // (~200 ms) is fully hidden behind the concurrent pipeline work.
  const ESTIMATED_FILE_COUNT = 1000;
  const metricsTaskRunner = deps.createMetricsTaskRunner(ESTIMATED_FILE_COUNT);
  const { maxThreads: metricsMaxThreads } = deps.getWorkerThreadCount(ESTIMATED_FILE_COUNT);
  const metricsWarmupPromise = Promise.all(
    Array.from({ length: metricsMaxThreads }, () =>
      metricsTaskRunner.run({ content: '', encoding: config.tokenCount.encoding }).catch((error) => {
        logger.trace('Metrics warmup task failed (non-fatal):', error);
        return 0;
      }),
    ),
  );

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => ({
        rootDir,
        ...(await deps.searchFiles(rootDir, config, explicitFiles)),
      })),
    ),
  );

  // Extract file paths (emptyDirPaths are forwarded to output generation to avoid a redundant searchFiles call)
  const filePathsByDir = searchResultsByDir.map(({ rootDir, filePaths }) => ({ rootDir, filePaths }));

  // Sort file paths
  progressCallback('Sorting files...');
  const allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
  const sortedFilePaths = deps.sortPaths(allFilePaths);

  // Regroup sorted file paths by rootDir using Set for O(1) membership checks
  const filePathSetByDir = new Map(filePathsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]));
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
      // Pre-fetch git file change counts to overlap the git subprocess with
      // file collection I/O. sortOutputFiles will find cached data later.
      // Errors are swallowed since this is an optimization; sortOutputFiles will retry if needed.
      prefetchGitFileChangeCounts(config).catch(() => {}),
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Start security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    const validationPromise = withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
    );
    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Build filePathsByRoot and emptyDirPaths early (needed for output generation)
    const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
      rootLabel: path.basename(rootDir) || rootDir,
      files: filePaths,
    }));
    const emptyDirPaths = searchResultsByDir.flatMap(({ emptyDirPaths }) => emptyDirPaths);

    // Check if skill generation is requested (needs security result, can't speculate)
    if (config.skillGenerate !== undefined && options.skillDir) {
      const validationResult = await validationPromise;
      const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
        validationResult;
      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      const processedFiles =
        suspiciousPathSet.size > 0
          ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path))
          : allProcessedFiles;

      await metricsWarmupPromise;
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

    // Speculative execution: start output generation and metrics with ALL processed files
    // while the security check is still running. The security check uses ~2 worker threads
    // on a separate pool, leaving spare CPU cores for metrics workers.
    //
    // In the common case (no suspicious files detected), the speculative results are
    // identical to what we'd compute after filtering, so no work is wasted.
    // In the rare case where suspicious files are found, we discard the speculative
    // results and regenerate with the filtered file set.
    await metricsWarmupPromise;

    progressCallback('Generating output...');
    const speculativeOutputPromise = deps.produceOutput(
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
    const speculativeOutputForMetrics = speculativeOutputPromise.then((r) => r.outputForMetrics);
    const speculativeMetricsPromise = withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(
        allProcessedFiles,
        speculativeOutputForMetrics,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        {
          taskRunner: metricsTaskRunner,
        },
      ),
    );

    // Prevent unhandled rejection if security check throws before we await these
    speculativeOutputPromise.catch(() => {});
    speculativeMetricsPromise.catch(() => {});

    // Wait for security check to complete
    const validationResult = await validationPromise;
    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    let outputFiles: string[] | undefined;
    let metrics: Awaited<ReturnType<typeof deps.calculateMetrics>>;
    let processedFiles: ProcessedFile[];

    if (suspiciousFilesResults.length === 0) {
      // Common case: no suspicious files, speculative results are correct
      processedFiles = allProcessedFiles;
      const [speculativeOutput, speculativeMetrics] = await Promise.all([
        speculativeOutputPromise,
        speculativeMetricsPromise,
      ]);
      outputFiles = speculativeOutput.outputFiles;
      metrics = speculativeMetrics;
    } else {
      // Rare case: suspicious files detected, discard speculative results and regenerate
      await Promise.allSettled([speculativeOutputPromise, speculativeMetricsPromise]);

      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      processedFiles = allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path));

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
      const outputForMetrics = outputPromise.then((r) => r.outputForMetrics);
      const [correctedOutput, correctedMetrics] = await Promise.all([
        outputPromise,
        deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
          taskRunner: metricsTaskRunner,
        }),
      ]);
      outputFiles = correctedOutput.outputFiles;
      metrics = correctedMetrics;
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
    await metricsTaskRunner.cleanup();
  }
};
