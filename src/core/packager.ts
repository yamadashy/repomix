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
import type { SecurityTaskRunner, SuspiciousFileResult } from './security/securityCheck.js';
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
  // Pre-warm security worker pool — lazily imports tinypool and creates the pool
  // so workers start loading @secretlint/core while file collection runs.
  createSecurityWorkerPool: async (numOfTasks: number): Promise<SecurityTaskRunner | undefined> => {
    const { createWorkerPool, cleanupWorkerPool } = await import('../shared/processConcurrency.js');
    const pool = createWorkerPool({
      numOfTasks,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
    return {
      run: (task) => pool.run(task) as Promise<SuspiciousFileResult | null>,
      cleanup: () => cleanupWorkerPool(pool),
    };
  },
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

  // Start git diffs/logs immediately — they only need rootDirs and config,
  // so they can overlap with file search, sorting, AND file collection
  // instead of just file collection (previously started after search + sort)
  const gitPromise = Promise.all([deps.getGitDiffs(rootDirs, config), deps.getGitLogs(rootDirs, config)]);

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

  let allFilePaths: string[];
  let sortedFilePathsByDir: { rootDir: string; filePaths: string[] }[];

  if (rootDirs.length === 1) {
    // Single root: files are already sorted by searchFiles, skip redundant re-sort.
    // This avoids decorate-sort-undecorate overhead (~5-10ms for 1000 files).
    allFilePaths = filePathsByDir[0].filePaths;
    sortedFilePathsByDir = [{ rootDir: rootDirs[0], filePaths: allFilePaths }];
  } else {
    // Multiple roots: combine and re-sort across all roots
    allFilePaths = filePathsByDir.flatMap(({ filePaths }) => filePaths);
    const sortedFilePaths = deps.sortPaths(allFilePaths);

    // Regroup sorted file paths by rootDir in a single O(n) pass.
    // Build a path→rootDir lookup, then iterate sortedFilePaths once to bucket them.
    const pathToRootDir = new Map<string, string>();
    for (const { rootDir, filePaths } of filePathsByDir) {
      for (const fp of filePaths) {
        pathToRootDir.set(fp, rootDir);
      }
    }
    const bucketsByRoot = new Map<string, string[]>(rootDirs.map((rd) => [rd, []]));
    for (const fp of sortedFilePaths) {
      const rd = pathToRootDir.get(fp);
      if (rd) {
        bucketsByRoot.get(rd)!.push(fp);
      }
    }
    sortedFilePathsByDir = rootDirs.map((rootDir) => ({
      rootDir,
      filePaths: bucketsByRoot.get(rootDir) ?? [],
    }));
    allFilePaths = sortedFilePaths;
  }

  // Build filePathsByRoot for multi-root tree generation
  const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
    rootLabel: path.basename(rootDir) || rootDir,
    files: filePaths,
  }));

  progressCallback('Collecting files and git info...');

  // Pre-warm security worker pool — start workers loading @secretlint/core (~150ms)
  // while file collection reads file contents (~50ms), giving workers a head start.
  // The pool creation triggers tinypool import + worker thread spawn asynchronously.
  const securityPoolPromise = config.security.enableSecurityCheck
    ? deps.createSecurityWorkerPool(allFilePaths.length + 2)
    : undefined;

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

  // Get pre-created security pool (workers likely already loading secretlint by now)
  const preCreatedSecurityRunner = securityPoolPromise ? await securityPoolPromise : undefined;

  // Run security check, file processing, and file metrics in parallel.
  // Security check uses the pre-warmed worker pool (CPU in worker threads).
  // After lightweight file processing (~1ms main thread), file metrics (token counting)
  // starts on the main thread, overlapping with the security workers (~300ms).
  // This hides ~85ms of token counting behind the security check latency.
  progressCallback('Running security check...');
  const [securityResult, processedAndMetrics] = await Promise.all([
    withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(
        rawFiles,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        undefined,
        preCreatedSecurityRunner,
      ),
    ),
    withMemoryLogging('Process Files', () => deps.processFiles(rawFiles, config, progressCallback)).then(
      async (allProcessedFiles) => {
        // Chain: after processing completes, start file metrics while security workers are still running
        const metricsTargetPaths = deps.getMetricsTargetPaths(allProcessedFiles, config);
        const fileMetrics = await deps.calculateSelectiveFileMetrics(
          allProcessedFiles,
          metricsTargetPaths,
          config.tokenCount.encoding,
          progressCallback,
        );
        return { allProcessedFiles, fileMetrics };
      },
    ),
  ]);
  const { allProcessedFiles, fileMetrics: precomputedFileMetrics } = processedAndMetrics;

  const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } = securityResult;

  // Filter processed files to only include safe ones
  const processedFiles =
    suspiciousFilesResults.length > 0
      ? (() => {
          const safePathSet = new Set(safeFilePaths);
          return allProcessedFiles.filter((file) => safePathSet.has(file.path));
        })()
      : allProcessedFiles;

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

  // Await pre-sorted files (git command likely already complete by now)
  const sortedProcessedFiles = await sortedFilesPromise;

  // Generate output and start writing to disk (write returned as a promise
  // so we can overlap metrics computation with I/O)
  const { outputFiles, outputForMetrics, writePromise } = await deps.produceOutput(
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

  // File metrics were already computed during the security check phase (overlapped).
  // Now only output/git token counting remains, which overlaps with disk write.
  const [metrics] = await Promise.all([
    withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(
        processedFiles,
        outputForMetrics,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        precomputedFileMetrics,
      ),
    ),
    writePromise,
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
};
