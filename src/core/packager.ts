import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import type { RepomixProgressCallback } from '../shared/types.js';
import { collectFiles, type SkippedFileInfo } from './file/fileCollect.js';
import { sortPaths } from './file/filePathSort.js';
import { createFileProcessTaskRunner, needsWorkerThreads, processFiles } from './file/fileProcess.js';
import { searchFiles } from './file/fileSearch.js';
import type { FilesByRoot } from './file/fileTreeGenerate.js';
import type { ProcessedFile } from './file/fileTypes.js';
import { getGitDiffs } from './git/gitDiffHandle.js';
import { getGitLogs } from './git/gitLogHandle.js';
import { calculateGitDiffMetrics } from './metrics/calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './metrics/calculateGitLogMetrics.js';
import { calculateMetrics, type PrecomputedMetrics } from './metrics/calculateMetrics.js';
import { calculateSelectiveFileMetrics } from './metrics/calculateSelectiveFileMetrics.js';
import { TokenCounter } from './metrics/TokenCounter.js';
import { produceOutput } from './packager/produceOutput.js';
import { createSecurityTaskRunner, runSecurityCheck, type SuspiciousFileResult } from './security/securityCheck.js';
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

  // Pre-warm worker pools so threads load modules during file collection disk I/O.
  // Security workers load secretlint, file process workers load tree-sitter.
  // Token counting and lightweight file processing use the main thread directly
  // (structured clone overhead far exceeds computation cost for pure JS operations).
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.createSecurityTaskRunner(allFilePaths.length)
    : undefined;
  // Only create file process workers when heavy processing is needed (compress/removeComments).
  // For lightweight ops (truncateBase64 + trim), main thread is ~4x faster.
  const fileProcessTaskRunner = needsWorkerThreads(config)
    ? deps.createFileProcessTaskRunner(allFilePaths.length)
    : undefined;

  // Pre-warm TokenCounter: start loading gpt-tokenizer encoding module (~158ms) in background.
  // By the time calculateMetrics runs (after collect + security + process + output), it's ready.
  const tokenCounterPromise = TokenCounter.create(config.tokenCount.encoding);

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

  // Run security check (workers) in parallel with file processing + token counting (main thread).
  // Security check runs on worker threads while the main thread processes files and counts tokens.
  // This overlaps ~290ms of worker-based security scanning with ~400ms of main-thread computation,
  // saving the sequential delay of waiting for security before starting processing.
  // Any files flagged as suspicious are filtered out after both operations complete.

  // Security check promise — workers are already warm from pre-warming above.
  const securityPromise = (async () => {
    try {
      return await withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, {
          runSecurityCheck: (files, cb, diff, log) =>
            runSecurityCheck(files, cb, diff, log, { taskRunner: securityTaskRunner }),
        }),
      );
    } finally {
      if (securityTaskRunner) {
        await securityTaskRunner.cleanup();
      }
    }
  })();

  // Main thread: process ALL raw files and count tokens while security workers scan.
  // For lightweight processing (no compress/removeComments), this runs entirely on the main thread.
  // Suspicious files (~0-5 typically) get processed but are filtered before output generation.
  progressCallback('Processing files...');
  let allProcessedFiles: ProcessedFile[];
  let precomputedMetrics: PrecomputedMetrics | undefined;
  try {
    allProcessedFiles = await withMemoryLogging('Process Files', () =>
      deps.processFiles(rawFiles, config, progressCallback, {
        ...(fileProcessTaskRunner && { taskRunner: fileProcessTaskRunner }),
      }),
    );

    // Count tokens on main thread while security workers are still running.
    // TokenCounter was pre-warmed during file collection so encoding module is ready.
    const tokenCounter = await tokenCounterPromise;
    const processedFilePaths = allProcessedFiles.map((file) => file.path);

    const [fileMetrics, gitDiffTokenCount, gitLogTokenCountResult] = await Promise.all([
      calculateSelectiveFileMetrics(
        allProcessedFiles,
        processedFilePaths,
        config.tokenCount.encoding,
        progressCallback,
        {
          tokenCounter,
        },
      ),
      calculateGitDiffMetrics(config, gitDiffResult, { tokenCounter }),
      calculateGitLogMetrics(config, gitLogResult, { tokenCounter }),
    ]);

    precomputedMetrics = {
      fileMetrics,
      gitDiffTokenCount,
      gitLogTokenCount: gitLogTokenCountResult.gitLogTokenCount,
    };
  } finally {
    if (fileProcessTaskRunner) {
      await fileProcessTaskRunner.cleanup();
    }
  }

  // Wait for security check to complete, then filter out suspicious files
  const securityResult = await securityPromise;
  const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } = securityResult;

  // Filter processed files and pre-computed metrics to only include safe files
  const safePathSet = new Set(safeFilePaths);
  const processedFiles = allProcessedFiles.filter((file) => safePathSet.has(file.path));
  if (precomputedMetrics && suspiciousFilesResults.length > 0) {
    precomputedMetrics = {
      ...precomputedMetrics,
      fileMetrics: precomputedMetrics.fileMetrics.filter((m) => safePathSet.has(m.path)),
    };
  }

  progressCallback('Generating output...');

  // Check if skill generation is requested
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

  // Collect empty dir paths from initial search to avoid duplicate globby traversal in output generation
  const emptyDirPaths = searchResultsByDir.flatMap(({ emptyDirPaths }) => emptyDirPaths);

  // Generate and write output
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

  // Finalize metrics with pre-computed token counts.
  // File token counting and git token counting already ran on the main thread
  // in parallel with security workers — only char counting and estimation remain.
  const metrics = await withMemoryLogging('Calculate Metrics', () =>
    deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
      precomputedMetrics,
    }),
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
