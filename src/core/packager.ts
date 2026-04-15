import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { processFiles } from './file/fileProcess.js';
import { searchEmptyDirectories, searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { prefetchSortData, sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
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

const defaultDeps = {
  searchFiles,
  searchEmptyDirectories,
  collectFiles,
  processFiles,
  validateFileSafety,
  produceOutput,
  calculateMetrics,
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

  // Disable empty directory search inside searchFiles — it is launched
  // concurrently with file collection via emptyDirPromise below, keeping
  // the ~100ms globby directory scan off the sequential critical path.
  const searchConfig = config.output.includeEmptyDirectories
    ? { ...config, output: { ...config.output, includeEmptyDirectories: false } }
    : config;

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, searchConfig, explicitFiles);
        return { rootDir, filePaths: result.filePaths };
      }),
    ),
  );

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

  // Pre-initialize metrics worker pool to overlap gpt-tokenizer loading with subsequent pipeline stages
  // (security check, file processing, output generation).
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    allFilePaths.length,
    config.tokenCount.encoding,
  );

  try {
    // Run file collection, git operations, and empty directory scan in parallel
    // since they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // - searchEmptyDirectories uses globby to scan for empty directories
    // Running empty dir scan here (instead of inside searchFiles) keeps the
    // ~100ms globby scan off the critical path — it overlaps with file collection.
    progressCallback('Collecting files...');
    const emptyDirPromise = config.output.includeEmptyDirectories
      ? Promise.all(rootDirs.map((rootDir) => deps.searchEmptyDirectories(rootDir, config))).then((results) =>
          [...new Set(results.flat())].sort(),
        )
      : undefined;

    const [collectResults, gitDiffResult, gitLogResult, emptyDirPaths] = await Promise.all([
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
      emptyDirPromise,
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Run security check and file processing concurrently.
    // Security check uses worker threads while file processing runs on the main thread
    // (in the default non-compress/non-removeComments config), so they don't compete for CPU.
    // After both complete, filter out any suspicious files from the processed results.
    const [validationResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
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
  }
};
