import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { initTaskRunner, type TaskRunner } from '../shared/processConcurrency.js';
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
import { produceOutput } from './packager/produceOutput.js';
import type { SuspiciousFileResult } from './security/securityCheck.js';
import { validateFileSafety } from './security/validateFileSafety.js';
import type { SecurityCheckTask } from './security/workers/securityCheckWorker.js';
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
  calculateSelectiveFileMetrics,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  packSkill,
  initTaskRunner: initTaskRunner as <T, R>(options: Parameters<typeof initTaskRunner>[0]) => TaskRunner<T, R>,
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
  const filePathsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return {
          rootDir,
          filePaths: result.filePaths,
          emptyDirPaths: result.emptyDirPaths,
        };
      }),
    ),
  );

  // Sort file paths
  progressCallback('Sorting files...');
  const allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
  const allEmptyDirPaths = filePathsByDir.flatMap(({ emptyDirPaths }) => emptyDirPaths);

  // Sort each root's file paths independently (avoids O(N²) flatten-sort-regroup)
  const sortedFilePathsByDir = filePathsByDir.map(({ rootDir, filePaths }) => ({
    rootDir,
    filePaths: deps.sortPaths(filePaths),
  }));

  // Pre-initialize security worker pool so worker threads start loading @secretlint modules
  // in the background while file collection runs. Created before the skill check since
  // security checks always run (when enabled) regardless of skill generation.
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
        numOfTasks: allFilePaths.length,
        workerType: 'securityCheck',
        runtime: 'worker_threads',
      })
    : undefined;

  // Run file collection and git operations in parallel since they are independent
  progressCallback('Collecting files and git information...');
  const [collectResults, gitDiffResult, gitLogResult] = await Promise.all([
    withMemoryLogging('Collect Files', () =>
      Promise.all(
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

  // Run security check and file processing in parallel since they are independent.
  // Processing all files (including potentially suspicious ones) is safe because
  // file processing only performs text transformations (comment removal, formatting).
  // Suspicious files are filtered out after both operations complete.
  //
  // Additionally, once file processing completes (typically faster than security check),
  // start file metrics calculation immediately to utilize the otherwise-idle main thread
  // while security workers continue running. This overlaps CPU-bound token counting
  // with the worker-bound security check.
  progressCallback('Running security check and processing files...');
  let securityResult: Awaited<ReturnType<typeof deps.validateFileSafety>>;
  let allProcessedFiles: ProcessedFile[];
  let fileMetricsPromise: Promise<Awaited<ReturnType<typeof deps.calculateSelectiveFileMetrics>>> | undefined;
  try {
    [securityResult, allProcessedFiles] = await Promise.all([
      withMemoryLogging('Security Check', () =>
        deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, undefined, {
          taskRunner: securityTaskRunner,
        }),
      ),
      withMemoryLogging('Process Files', () =>
        deps.processFiles(rawFiles, config, progressCallback).then((processed) => {
          // File processing finished — start file metrics while security workers are still running.
          // This counts tokens on ALL processed files (including potentially suspicious ones).
          // Suspicious files are rare (typically 0), so the extra work is negligible.
          const metricsTargetPaths = getMetricsTargetPaths(processed, config);
          fileMetricsPromise = deps.calculateSelectiveFileMetrics(
            processed,
            metricsTargetPaths,
            config.tokenCount.encoding,
            progressCallback,
          );
          fileMetricsPromise.catch(() => {});
          return processed;
        }),
      ),
    ]);
  } finally {
    // Clean up security worker pool now that security check is complete
    if (securityTaskRunner) {
      await securityTaskRunner.cleanup();
    }
  }

  const { suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } = securityResult;

  // Filter out suspicious files from processed results
  const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
  const processedFiles =
    suspiciousPathSet.size > 0
      ? allProcessedFiles.filter((file) => !suspiciousPathSet.has(file.path))
      : allProcessedFiles;
  const safeFilePaths = processedFiles.map((file) => file.path);

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

  // Generate and write output (handles both single and split output)
  const { outputFiles, outputForMetrics } = await deps.produceOutput(
    rootDirs,
    config,
    processedFiles,
    allFilePaths,
    gitDiffResult,
    gitLogResult,
    progressCallback,
    filePathsByRoot,
    allEmptyDirPaths,
  );

  // Calculate remaining metrics on main thread, reusing precomputed file metrics
  // that started during the security check phase.
  const metrics = await withMemoryLogging('Calculate Metrics', () =>
    deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
      precomputedFileMetrics: fileMetricsPromise,
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
