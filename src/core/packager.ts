import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { createFileProcessTaskRunner, processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { produceOutput } from './packager/produceOutput.js';
import { createSecurityTaskRunner, type SuspiciousFileResult } from './security/securityCheck.js';
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
  createFileProcessTaskRunner,
  createSecurityTaskRunner,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  packSkill,
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

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );
  const filePathsByDir = searchResultsByDir;

  // Sort file paths
  progressCallback('Sorting files...');
  const allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
  const sortedFilePaths = deps.sortPaths(allFilePaths);

  // Regroup sorted file paths by rootDir using Set-based lookup (O(N) instead of O(N²))
  const filePathSetsByDir = new Map(filePathsByDir.map(({ rootDir, filePaths }) => [rootDir, new Set(filePaths)]));
  const sortedFilePathsByDir = rootDirs.map((rootDir) => ({
    rootDir,
    filePaths: sortedFilePaths.filter((filePath: string) => filePathSetsByDir.get(rootDir)?.has(filePath) ?? false),
  }));

  // Pre-warm ALL worker pools so threads load modules during file collection disk I/O.
  // Security workers load secretlint, file process workers load tree-sitter,
  // metrics workers load gpt-tokenizer — all happen in background while the
  // main thread reads files from disk and runs security/processing stages.
  // This gives metrics workers ~800ms+ of warm-up time (collectFiles + security +
  // fileProcess + outputGenerate) instead of only ~50ms (outputGenerate alone).
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.createSecurityTaskRunner(allFilePaths.length)
    : undefined;
  const fileProcessTaskRunner = deps.createFileProcessTaskRunner(allFilePaths.length);
  const metricsTaskRunner = deps.createMetricsTaskRunner(allFilePaths.length);

  // Start git operations in parallel with file collection — they only need rootDirs and config
  progressCallback('Collecting files...');
  const gitPromise = Promise.all([deps.getGitDiffs(rootDirs, config), deps.getGitLogs(rootDirs, config)]);

  const collectResults = await withMemoryLogging(
    'Collect Files',
    async () =>
      await Promise.all(
        sortedFilePathsByDir.map(({ rootDir, filePaths }) =>
          deps.collectFiles(filePaths, rootDir, config, progressCallback),
        ),
      ),
  );

  const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
  const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

  // Await git results (likely already resolved while files were being collected)
  const [gitDiffResult, gitLogResult] = await gitPromise;

  // Run security check — workers are already warm from pre-warming above
  let securityResult: Awaited<ReturnType<typeof deps.validateFileSafety>>;
  try {
    securityResult = await withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, {
        taskRunner: securityTaskRunner,
      }),
    );
  } finally {
    // Cleanup security worker pool after security check completes
    if (securityTaskRunner) {
      await securityTaskRunner.cleanup();
    }
  }
  const { safeFilePaths, safeRawFiles, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
    securityResult;

  // Process files (remove comments, etc.) — workers are already warm from pre-warming above
  progressCallback('Processing files...');
  let processedFiles: ProcessedFile[];
  try {
    processedFiles = await withMemoryLogging('Process Files', () =>
      deps.processFiles(safeRawFiles, config, progressCallback, { taskRunner: fileProcessTaskRunner }),
    );
  } finally {
    await fileProcessTaskRunner.cleanup();
  }

  progressCallback('Generating output...');

  // Check if skill generation is requested
  if (config.skillGenerate !== undefined && options.skillDir) {
    // Cleanup pre-warmed metrics workers (not needed for skill generation)
    await metricsTaskRunner.cleanup();

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

  // Collect empty dir paths from initial search to avoid duplicate globby traversal in output generation
  const emptyDirPaths = searchResultsByDir.flatMap(({ emptyDirPaths }) => emptyDirPaths);

  // Generate and write output (metrics workers already warm from early pre-warming)
  const { outputFiles, outputForMetrics } = await deps.produceOutput(
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

  // All workers warm from early pre-warming — token counting starts without init delay
  let metrics: Awaited<ReturnType<typeof deps.calculateMetrics>>;
  try {
    metrics = await withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
        taskRunner: metricsTaskRunner,
      }),
    );
  } finally {
    await metricsTaskRunner.cleanup();
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
};
