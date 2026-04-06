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
import { getGitDiffs, type GitDiffResult } from './git/gitDiffHandle.js';
import { getGitLogs, type GitLogResult } from './git/gitLogHandle.js';
import { calculateMetrics, type CalculateMetricsResult, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { prewarmGitSortCache } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';
import { packSkill } from './skill/packSkill.js';

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
  sortPaths,
  getGitDiffs,
  getGitLogs,
  prewarmGitSortCache,
  packSkill,
};

export interface PackOptions {
  skillName?: string;
  skillDir?: string;
  skillProjectName?: string;
  skillSourceUrl?: string;
}

const filterSuspiciousFiles = (
  allFiles: ProcessedFile[],
  suspiciousResults: SuspiciousFileResult[],
): ProcessedFile[] => {
  if (suspiciousResults.length === 0) return allFiles;
  const suspiciousPathSet = new Set(suspiciousResults.map((r) => r.filePath));
  return allFiles.filter((f) => !suspiciousPathSet.has(f.path));
};

/** Run output generation and metrics calculation in parallel. */
const runOutputAndMetrics = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  processedFiles: ProcessedFile[],
  allFilePaths: string[],
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  progressCallback: RepomixProgressCallback,
  filePathsByRoot: FilesByRoot[],
  emptyDirPaths: string[] | undefined,
  metricsRunnerDeps: { taskRunner: ReturnType<typeof createMetricsTaskRunner>['taskRunner'] },
  deps: Pick<typeof defaultDeps, 'produceOutput' | 'calculateMetrics'>,
): Promise<{ outputFiles: string[] | undefined; metrics: CalculateMetricsResult }> => {
  const outputPromise = deps.produceOutput(
    rootDirs, config, processedFiles, allFilePaths,
    gitDiffResult, gitLogResult, progressCallback, filePathsByRoot, emptyDirPaths,
  );

  const outputForMetrics = outputPromise.then((r) => r.outputForMetrics);

  const [{ outputFiles }, metrics] = await Promise.all([
    outputPromise,
    withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(
        processedFiles, outputForMetrics, progressCallback, config,
        gitDiffResult, gitLogResult, metricsRunnerDeps,
      ),
    ),
  ]);

  return { outputFiles, metrics };
};

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

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  // Deduplicate and sort empty directory paths for reuse during output generation.
  const emptyDirPaths = config.output.includeEmptyDirectories
    ? [...new Set(searchResultsByDir.flatMap((r) => r.emptyDirPaths))].sort()
    : undefined;

  progressCallback('Sorting files...');
  const allFilePaths = searchResultsByDir.flatMap(({ filePaths }) => filePaths);
  const sortedFilePaths = deps.sortPaths(allFilePaths);
  const filePathSetByDir = new Map(searchResultsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]));
  const sortedFilePathsByDir = rootDirs.map((rootDir) => ({
    rootDir,
    filePaths: sortedFilePaths.filter((filePath) => filePathSetByDir.get(rootDir)?.has(filePath) ?? false),
  }));

  // Pre-initialize metrics worker pool to overlap gpt-tokenizer loading with subsequent stages.
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    allFilePaths.length,
    config.tokenCount.encoding,
  );

  try {
    // Run file collection, git operations, and git sort cache pre-warming in parallel
    // since they are independent.
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
      deps.prewarmGitSortCache(config),
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Run security check and file processing concurrently.
    const securityPromise = withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
    );

    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Skill generation path — wait for security, filter, and return early
    if (config.skillGenerate !== undefined && options.skillDir) {
      const validationResult = await securityPromise;
      const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
        validationResult;
      const processedFiles = filterSuspiciousFiles(allProcessedFiles, suspiciousFilesResults);

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
    const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
      rootLabel: path.basename(rootDir) || rootDir,
      files: filePaths,
    }));

    // Ensure warm-up task completes before metrics calculation
    await metricsWarmupPromise;

    progressCallback('Generating output...');

    // Start output and metrics optimistically with ALL processed files, overlapping
    // with the still-running security check. If security finds suspicious files (rare),
    // fall back to regenerating with filtered files.
    const metricsRunnerDeps = { taskRunner: metricsTaskRunner };
    const outputAndMetrics = runOutputAndMetrics(
      rootDirs, config, allProcessedFiles, allFilePaths,
      gitDiffResult, gitLogResult, progressCallback, filePathsByRoot, emptyDirPaths,
      metricsRunnerDeps, deps,
    );

    // Prevent unhandled rejections if securityPromise rejects before
    // the optimistic pipeline settles.
    outputAndMetrics.catch(() => {});

    // Wait for the optimistic pipeline and security check to complete
    const [{ outputFiles: optimisticOutputFiles, metrics: optimisticMetrics }, validationResult] =
      await Promise.all([outputAndMetrics, securityPromise]);

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    let finalOutputFiles = optimisticOutputFiles;
    let finalMetrics = optimisticMetrics;
    let finalProcessedFiles: ProcessedFile[] = allProcessedFiles;

    // If security found suspicious files, regenerate output and metrics with filtered files
    if (suspiciousFilesResults.length > 0) {
      finalProcessedFiles = filterSuspiciousFiles(allProcessedFiles, suspiciousFilesResults);

      const filtered = await runOutputAndMetrics(
        rootDirs, config, finalProcessedFiles, allFilePaths,
        gitDiffResult, gitLogResult, progressCallback, filePathsByRoot, emptyDirPaths,
        metricsRunnerDeps, deps,
      );
      finalOutputFiles = filtered.outputFiles;
      finalMetrics = filtered.metrics;
    }

    const result = {
      ...finalMetrics,
      ...(finalOutputFiles && { outputFiles: finalOutputFiles }),
      suspiciousFilesResults,
      suspiciousGitDiffResults,
      suspiciousGitLogResults,
      processedFiles: finalProcessedFiles,
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
