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
import { calculateMetrics, getMetricsTargetPaths } from './metrics/calculateMetrics.js';
import { calculateSelectiveFileMetrics } from './metrics/calculateSelectiveFileMetrics.js';
import { sortOutputFiles } from './output/outputSort.js';
import { produceOutput } from './packager/produceOutput.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
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
  calculateSelectiveFileMetrics,
  getMetricsTargetPaths,
  sortPaths,
  sortOutputFiles,
  getGitDiffs,
  getGitLogs,
  // Lazy-load packSkill — only needed when --skill-generate is used.
  // Avoids importing skill section generators and their transitive deps on every run.
  packSkill: async (params: Record<string, unknown>) => {
    const { packSkill } = await import('./skill/packSkill.js');
    return packSkill(params as never);
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

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  // Collect emptyDirPaths from initial search to avoid redundant filesystem scans later
  const emptyDirPaths = searchResultsByDir.flatMap(({ emptyDirPaths }) => emptyDirPaths);
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

  // Start git diffs/logs in parallel with file collection - they only need rootDirs and config,
  // not file contents, so there's no dependency between them
  progressCallback('Collecting files and git info...');
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

  const [gitDiffResult, gitLogResult] = await gitPromise;

  // Run security check and get filtered safe files
  const { safeFilePaths, safeRawFiles, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
    await withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
    );

  // Process files (remove comments, etc.)
  progressCallback('Processing files...');
  const processedFiles = await withMemoryLogging('Process Files', () =>
    deps.processFiles(safeRawFiles, config, progressCallback),
  );

  // Start git-based file sorting immediately after processedFiles are ready.
  // sortOutputFiles runs a git command (~50-200ms) to get file change counts.
  // By starting it here, the git command overlaps with metrics computation and
  // output context building instead of blocking the output generation pipeline.
  const sortedFilesPromise = deps.sortOutputFiles(processedFiles, config);

  progressCallback('Generating output...');

  // Check if skill generation is requested
  if (config.skillGenerate !== undefined && options.skillDir) {
    const sortedProcessedFiles = await sortedFilesPromise;
    const result = await deps.packSkill({
      rootDirs,
      config,
      options,
      processedFiles: sortedProcessedFiles,
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

  // Start file token counting in parallel with output generation.
  // File metrics only need processedFiles + encoding, not the output string,
  // so they can overlap with output generation for a ~50-100ms improvement.
  const metricsTargetPaths = deps.getMetricsTargetPaths(processedFiles, config);
  const fileMetricsPromise = deps.calculateSelectiveFileMetrics(
    processedFiles,
    metricsTargetPaths,
    config.tokenCount.encoding,
    progressCallback,
  );

  // Await pre-sorted files (git command likely already complete by now)
  const sortedProcessedFiles = await sortedFilesPromise;

  // Generate and write output (handles both single and split output)
  const { outputFiles, outputForMetrics } = await deps.produceOutput(
    rootDirs,
    config,
    sortedProcessedFiles,
    allFilePaths,
    gitDiffResult,
    gitLogResult,
    progressCallback,
    filePathsByRoot,
    emptyDirPaths,
  );

  // Await file metrics (likely already complete by now), then pass to calculateMetrics
  // which will skip file token counting and only compute output/git metrics
  const precomputedFileMetrics = await fileMetricsPromise;

  const metrics = await withMemoryLogging('Calculate Metrics', () =>
    deps.calculateMetrics(
      processedFiles,
      outputForMetrics,
      progressCallback,
      config,
      gitDiffResult,
      gitLogResult,
      precomputedFileMetrics,
    ),
  );

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
