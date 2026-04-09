import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { getProcessConcurrency } from '../shared/processConcurrency.js';
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
import { prefetchFileChangeCounts } from './output/outputSort.js';
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
  collectFiles,
  processFiles,
  validateFileSafety,
  produceOutput,
  calculateMetrics,
  createMetricsTaskRunner,
  getProcessConcurrency,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  // Lazy-load packSkill to defer importing the skill module chain
  // (skillSectionGenerators, skillStyle → Handlebars), which adds ~25ms
  // to module loading. Only used when --skill-generate is active (non-default).
  packSkill: async (params: PackSkillParams) => {
    const { packSkill } = await import('./skill/packSkill.js');
    return packSkill(params);
  },
  prefetchFileChangeCounts,
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

  let metricsTaskRunner: Awaited<ReturnType<typeof deps.createMetricsTaskRunner>>['taskRunner'] | undefined;
  let metricsWarmupPromise: Promise<unknown> | undefined;

  try {
    // Start git operations early: they depend only on rootDirs and config (not on the file list),
    // so they can run concurrently with file search and collection. Git subprocesses execute
    // during the async searchFiles phase when the event loop is active and can drain subprocess
    // stdout. For typical repos the subprocesses finish before collectFiles starts its
    // synchronous reads; if not, their output is buffered in the OS pipe and drained when
    // the event loop resumes after collectFiles.
    const gitOpsPromise = Promise.all([
      deps.getGitDiffs(rootDirs, config),
      deps.getGitLogs(rootDirs, config),
      deps.prefetchFileChangeCounts(config),
    ]);

    progressCallback('Searching for files...');
    const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
      Promise.all(
        rootDirs.map(async (rootDir) => {
          const result = await deps.searchFiles(rootDir, config, explicitFiles);
          return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
        }),
      ),
    );

    // Initialize metrics worker pool AFTER file search completes.
    // Worker thread spawning and BPE initialization are CPU-intensive (~120ms total),
    // which competes with git subprocesses and picomatch pattern matching during
    // file search on machines with limited cores (4-core: 4 worker threads + 6 git
    // processes + main thread = 11 tasks on 4 cores). Deferring pool creation until
    // after search eliminates this contention, reducing search time significantly.
    // The warmup then overlaps with file collection, processing, and the security
    // check, which are I/O-bound and don't contend with worker CPU usage.
    const allFileCount = searchResultsByDir.reduce((sum, r) => sum + r.filePaths.length, 0);

    // Size the worker pool based on estimated tokenization needs, not total file count.
    // When tokenCountTree is disabled, only ~50 files are tokenized for ranking/estimation
    // (mirrors selectTopFilesBySize), so spawning excess workers causes BPE init contention.
    const estimatedTokenTasks = config.output.tokenCountTree
      ? allFileCount
      : Math.max(50, config.output.topFilesLength * 10);
    ({ taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
      estimatedTokenTasks,
      config.tokenCount.encoding,
    ));

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

    progressCallback('Collecting files...');
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

    // Start file processing immediately — it doesn't depend on git results.
    const processFilesPromise = withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Await git results (typically already completed during searchFiles + collectFiles).
    const [gitDiffResult, gitLogResult] = await gitOpsPromise;

    // Start security check. Runs on the main thread (see MAIN_THREAD_THRESHOLD in
    // securityCheck.ts) to avoid spawning worker threads that would compete for CPU
    // with the metrics worker pool.
    const validationPromise = withMemoryLogging('Security Check', () =>
      deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult),
    );

    const allProcessedFiles = await processFilesPromise;

    // Ensure warm-up task completes before metrics calculation
    await metricsWarmupPromise;

    // Create a deferred promise for the output. This allows starting file and git metrics
    // immediately (they don't depend on output), while output metrics waits for the deferred
    // to be resolved once output generation completes. The output generation itself must wait
    // for the security check to filter suspicious files, but file/git metrics can overlap
    // with the remaining security check time.
    let resolveOutputForMetrics!: (value: string | string[]) => void;
    let rejectOutputForMetrics!: (reason?: unknown) => void;
    const outputForMetricsDeferred = new Promise<string | string[]>((resolve, reject) => {
      resolveOutputForMetrics = resolve;
      rejectOutputForMetrics = reject;
    });

    // Start metrics calculation immediately. File and git metrics begin right away,
    // output metrics will start once the deferred promise resolves.
    const metricsPromise = withMemoryLogging('Calculate Metrics', () =>
      deps.calculateMetrics(
        allProcessedFiles,
        outputForMetricsDeferred,
        progressCallback,
        config,
        gitDiffResult,
        gitLogResult,
        {
          taskRunner: metricsTaskRunner,
        },
      ),
    );

    // Wait for security check to complete before generating output
    const validationResult = await validationPromise;

    const { safeFilePaths, suspiciousFilesResults, suspiciousGitDiffResults, suspiciousGitLogResults } =
      validationResult;

    // Filter processed files to exclude suspicious ones
    const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
    const processedFiles =
      suspiciousPathSet.size > 0 ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path)) : allProcessedFiles;

    progressCallback('Generating output...');

    // Skill generation path — metrics not needed, return early (worker pool cleaned up by finally)
    if (config.skillGenerate !== undefined && options.skillDir) {
      // Resolve the deferred to unblock metrics cleanup, then cancel by cleaning up the pool
      resolveOutputForMetrics('');
      await metricsPromise.catch(() => {});

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

    // Generate and write output. Resolve the deferred promise to feed the output
    // into the metrics calculation that's already running file/git metrics.
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
    outputPromise.then(
      (r) => resolveOutputForMetrics(r.outputForMetrics),
      (err) => rejectOutputForMetrics(err),
    );

    const [{ outputFiles }, metrics] = await Promise.all([outputPromise, metricsPromise]);

    // Create a result object that includes metrics and security results.
    // Override totalFiles since metrics ran on allProcessedFiles (pre-security-filter)
    // to overlap with the security check, but the reported count should reflect the filtered set.
    const result = {
      ...metrics,
      totalFiles: processedFiles.length,
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
    // Fire-and-forget: don't block on worker pool teardown (~70ms).
    // All metric tasks have completed, so this only terminates idle threads.
    // For CLI: process.exit() in the entry point handles immediate thread cleanup.
    // For MCP/library: Tinypool's idleTimeout (5s) reclaims threads.
    if (metricsWarmupPromise) {
      metricsWarmupPromise.catch(() => {});
    }
    if (metricsTaskRunner) {
      Promise.resolve(metricsTaskRunner.cleanup()).catch((error) => {
        logger.debug('Metrics worker pool cleanup error:', error);
      });
    }
  }
};
