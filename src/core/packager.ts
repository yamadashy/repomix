import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { getWorkerThreadCount, initTaskRunner, type TaskRunner } from '../shared/processConcurrency.js';
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
import type { FileMetrics } from './metrics/workers/types.js';
import { preWarmFileChangeCounts } from './output/outputSort.js';
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
  preWarmFileChangeCounts,
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
  // Security workers load secretlint, file process workers load tree-sitter,
  // metrics workers pre-load gpt-tokenizer for parallel BPE token counting.
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.createSecurityTaskRunner(allFilePaths.length)
    : undefined;
  // Only create file process workers when heavy processing is needed (compress/removeComments).
  // For lightweight ops (truncateBase64 + trim), main thread is ~4x faster.
  const fileProcessTaskRunner = needsWorkerThreads(config)
    ? deps.createFileProcessTaskRunner(allFilePaths.length)
    : undefined;

  // Pre-warm metrics workers for parallel token counting. BPE tokenization is CPU-heavy
  // (~750ms for ~1000 files). With 2 worker threads, the work splits to ~380ms each,
  // AND the main thread is free for output generation — overlapping ~100ms of I/O.
  // Workers pre-load gpt-tokenizer (~200ms) during file collection to eliminate cold-start.
  // For small repos (<50 files), worker overhead exceeds benefit; use main thread instead.
  const WORKER_TOKEN_COUNTING_THRESHOLD = 50;
  const useWorkerTokenCounting = allFilePaths.length >= WORKER_TOKEN_COUNTING_THRESHOLD;
  let metricsTaskRunner: TaskRunner<unknown, unknown> | undefined;
  if (useWorkerTokenCounting) {
    const { maxThreads } = getWorkerThreadCount(allFilePaths.length, { reserveForMainThread: true });
    metricsTaskRunner = initTaskRunner({
      numOfTasks: allFilePaths.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
      reserveForMainThread: true,
    });
    // Fire warmup tasks to pre-load gpt-tokenizer in each worker thread.
    // Empty batches trigger getTokenCounter() which caches the encoder for real tasks.
    for (let i = 0; i < maxThreads; i++) {
      metricsTaskRunner.run({ files: [], encoding: config.tokenCount.encoding, batch: true });
    }
  }

  // Pre-warm TokenCounter on main thread for git diff/log token counting (small data).
  // For large repos, file token counting uses pre-warmed worker threads instead.
  const tokenCounterPromise = TokenCounter.create(config.tokenCount.encoding);

  // Start git operations in parallel with file collection — they only need rootDirs and config.
  // Also pre-warm the git file change count cache used by sortOutputFiles during output generation,
  // so the git log --name-only call overlaps with file collection disk I/O.
  progressCallback('Collecting files...');
  const gitPromise = Promise.all([deps.getGitDiffs(rootDirs, config), deps.getGitLogs(rootDirs, config)]);
  const fileChangeCountPromise = deps.preWarmFileChangeCounts(config);

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

  // Process ALL raw files while security workers scan.
  // For lightweight processing (no compress/removeComments), this runs entirely on the main thread.
  // Suspicious files (~0-5 typically) get processed but are filtered before output generation.
  progressCallback('Processing files...');
  let allProcessedFiles: ProcessedFile[];
  try {
    allProcessedFiles = await withMemoryLogging('Process Files', () =>
      deps.processFiles(rawFiles, config, progressCallback, {
        ...(fileProcessTaskRunner && { taskRunner: fileProcessTaskRunner }),
      }),
    );
  } finally {
    if (fileProcessTaskRunner) {
      await fileProcessTaskRunner.cleanup();
    }
  }

  // Start token counting: workers for large repos (parallel BPE), main thread for small repos.
  // Worker path: files are distributed across pre-warmed threads using stride assignment
  // (file i → batch i%N) to balance content size evenly across batches.
  // Main thread path: synchronous counting (fast enough for <50 files).
  let fileMetricsPromise: Promise<FileMetrics[]>;
  if (metricsTaskRunner) {
    const { maxThreads } = getWorkerThreadCount(allProcessedFiles.length, { reserveForMainThread: true });
    const batchCount = Math.max(1, maxThreads);
    // Stride assignment: file[0]→batch0, file[1]→batch1, ..., file[N]→batch0, ...
    // This evenly distributes large/small files across batches regardless of sort order.
    const batches: Array<Array<{ content: string; path: string }>> = Array.from({ length: batchCount }, () => []);
    for (let i = 0; i < allProcessedFiles.length; i++) {
      const f = allProcessedFiles[i];
      batches[i % batchCount].push({ content: f.content, path: f.path });
    }
    fileMetricsPromise = Promise.all(
      batches.map((files) =>
        metricsTaskRunner?.run({
          files,
          encoding: config.tokenCount.encoding,
          batch: true,
        }),
      ),
    ).then((results) => (results as FileMetrics[][]).flat());
  } else {
    const tokenCounter = await tokenCounterPromise;
    fileMetricsPromise = calculateSelectiveFileMetrics(
      allProcessedFiles,
      allProcessedFiles.map((f) => f.path),
      config.tokenCount.encoding,
      progressCallback,
      { tokenCounter },
    );
  }

  // Git diff/log token counting on main thread (small data, <10ms total)
  const tokenCounter = await tokenCounterPromise;
  const gitDiffTokenCountPromise = calculateGitDiffMetrics(config, gitDiffResult, { tokenCounter });
  const gitLogMetricsPromise = calculateGitLogMetrics(config, gitLogResult, { tokenCounter });

  // Wait for security check to complete (likely already done), then filter out suspicious files
  const securityResult = await securityPromise;
  const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } = securityResult;

  const safePathSet = new Set(safeFilePaths);
  const processedFiles = allProcessedFiles.filter((file) => safePathSet.has(file.path));

  // Ensure file change count cache is populated (likely already resolved during file collection)
  await fileChangeCountPromise;

  progressCallback('Generating output...');

  // Check if skill generation is requested
  if (config.skillGenerate !== undefined && options.skillDir) {
    // Clean up metrics workers before early return (skill generation has its own metrics)
    if (metricsTaskRunner) {
      await metricsTaskRunner.cleanup();
    }
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

  // Await token counting results (workers may still be running if output gen was fast)
  const [fileMetrics, gitDiffTokenCount, { gitLogTokenCount }] = await Promise.all([
    fileMetricsPromise,
    gitDiffTokenCountPromise,
    gitLogMetricsPromise,
  ]);

  // Clean up metrics workers
  if (metricsTaskRunner) {
    await metricsTaskRunner.cleanup();
  }

  // Build pre-computed metrics, filtering out suspicious files if any
  let precomputedMetrics: PrecomputedMetrics = {
    fileMetrics,
    gitDiffTokenCount,
    gitLogTokenCount,
  };
  if (suspiciousFilesResults.length > 0) {
    precomputedMetrics = {
      ...precomputedMetrics,
      fileMetrics: fileMetrics.filter((m) => safePathSet.has(m.path)),
    };
  }

  // Finalize metrics with pre-computed token counts.
  // File token counting ran on worker threads (or main thread for small repos)
  // in parallel with output generation — only char counting and estimation remain.
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
