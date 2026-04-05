import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logger } from '../shared/logger.js';
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
import { calculateMetrics, createMetricsTaskRunner } from './metrics/calculateMetrics.js';
import { generateOutput } from './output/outputGenerate.js';
import { copyToClipboardIfEnabled } from './packager/copyToClipboardIfEnabled.js';
import { produceOutput } from './packager/produceOutput.js';
import { writeOutputToDisk } from './packager/writeOutputToDisk.js';
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
  generateOutput,
  produceOutput,
  writeOutputToDisk,
  copyToClipboardIfEnabled,
  calculateMetrics,
  createMetricsTaskRunner,
  createSecurityTaskRunner,
  sortPaths,
  getGitDiffs,
  getGitLogs,
  packSkill,
};

// Heuristic task count for early metrics worker pool initialization.
// 200 yields 2 workers on most machines, balancing warmup speed
// (less CPU contention during gpt-tokenizer loading) with parallelism.
const EARLY_WARMUP_TASK_ESTIMATE = 200;

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

  // Pre-initialize metrics worker pool before file search to maximize overlap of
  // gpt-tokenizer loading with the entire pipeline (search, collection, security, processing).
  const { taskRunner: metricsTaskRunner, warmupPromise: metricsWarmupPromise } = deps.createMetricsTaskRunner(
    EARLY_WARMUP_TASK_ESTIMATE,
    config.tokenCount.encoding,
  );

  const securityEnabled = config.security.enableSecurityCheck;

  progressCallback('Searching for files...');
  const searchResultsByDir = await withMemoryLogging('Search Files', async () =>
    Promise.all(
      rootDirs.map(async (rootDir) => {
        const result = await deps.searchFiles(rootDir, config, explicitFiles);
        return { rootDir, filePaths: result.filePaths, emptyDirPaths: result.emptyDirPaths };
      }),
    ),
  );

  // Initialize security worker pool AFTER file search completes, not before.
  // Creating eager workers earlier causes heavy I/O contention during search
  // (multiple worker threads loading @secretlint/core compete with globby's
  // file-system traversal, inflating search from ~170ms to ~400ms).
  // By deferring creation to here, @secretlint/core loading (~150ms) overlaps
  // with the file collection phase instead, where I/O contention is lower.
  const securityTaskRunner = securityEnabled ? deps.createSecurityTaskRunner(1000) : undefined;

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

  try {
    // Run file collection and git operations in parallel since they are independent:
    // - collectFiles reads file contents from disk
    // - getGitDiffs/getGitLogs spawn git subprocesses
    // Neither depends on the other's results.
    // Security workers are loading @secretlint in the background during this phase.
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
    ]);

    const rawFiles = collectResults.flatMap((curr) => curr.rawFiles);
    const allSkippedFiles = collectResults.flatMap((curr) => curr.skippedFiles);

    // Start security check and file processing concurrently.
    // Security workers are already warmed up (loaded @secretlint during file search/collection),
    // so the security check starts processing immediately without module loading delay.
    //
    // Optimistic pipeline: start output generation immediately after file processing,
    // without waiting for security check to complete. In the common case (no suspicious
    // files found, which is >95% of runs), this overlaps the entire security check
    // (~120ms) with output generation and metrics calculation, saving ~10-12% of total time.
    // If security does find suspicious files, the output is regenerated with filtered files.
    const securityPromise = securityEnabled
      ? withMemoryLogging('Security Check', () =>
          deps.validateFileSafety(rawFiles, progressCallback, config, gitDiffResult, gitLogResult, securityTaskRunner),
        )
      : null;

    const allProcessedFiles = await withMemoryLogging('Process Files', () => {
      progressCallback('Processing files...');
      return deps.processFiles(rawFiles, config, progressCallback);
    });

    // Skill generation path — needs security results, wait for them
    if (config.skillGenerate !== undefined && options.skillDir) {
      const validationResult = securityPromise ? await securityPromise : null;
      if (securityTaskRunner) {
        await securityTaskRunner.cleanup();
      }

      const suspiciousFilesResults = validationResult?.suspiciousFilesResults ?? [];
      const suspiciousGitDiffResults = validationResult?.suspiciousGitDiffResults ?? [];
      const suspiciousGitLogResults = validationResult?.suspiciousGitLogResults ?? [];
      const safeFilePaths = validationResult?.safeFilePaths ?? rawFiles.map((f) => f.path);

      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      const processedFiles =
        suspiciousPathSet.size > 0
          ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path))
          : allProcessedFiles;

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

    progressCallback('Generating output...');

    // Determine if the optimistic pipeline can be used.
    // Split output mode requires multiple generate-then-write cycles internally,
    // so it falls back to the original sequential approach.
    const useSplitOutput = config.output.splitOutput !== undefined;

    let processedFiles: ProcessedFile[];
    let outputFiles: string[] | undefined;
    let metrics: Awaited<ReturnType<typeof deps.calculateMetrics>>;
    let suspiciousFilesResults: SuspiciousFileResult[] = [];
    let suspiciousGitDiffResults: SuspiciousFileResult[] = [];
    let suspiciousGitLogResults: SuspiciousFileResult[] = [];
    let safeFilePaths: string[] = rawFiles.map((f) => f.path);

    const resolveSecurityResults = (validationResult: Awaited<ReturnType<typeof deps.validateFileSafety>> | null) => {
      suspiciousFilesResults = validationResult?.suspiciousFilesResults ?? [];
      suspiciousGitDiffResults = validationResult?.suspiciousGitDiffResults ?? [];
      suspiciousGitLogResults = validationResult?.suspiciousGitLogResults ?? [];
      safeFilePaths = validationResult?.safeFilePaths ?? rawFiles.map((f) => f.path);
    };

    if (useSplitOutput) {
      // Split output mode: wait for security, then produce output normally.
      const validationResult = securityPromise ? await securityPromise : null;
      if (securityTaskRunner) {
        await securityTaskRunner.cleanup();
      }
      resolveSecurityResults(validationResult);

      const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
      processedFiles =
        suspiciousPathSet.size > 0
          ? allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path))
          : allProcessedFiles;

      const splitOutputPromise = deps.produceOutput(
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
      const splitOutputForMetrics = splitOutputPromise.then((r) => r.outputForMetrics);

      [{ outputFiles }, metrics] = await Promise.all([
        splitOutputPromise,
        withMemoryLogging('Calculate Metrics', () =>
          deps.calculateMetrics(
            processedFiles,
            splitOutputForMetrics,
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
    } else {
      // Single output mode: optimistic pipeline.
      // Generate the output STRING immediately with all processed files,
      // overlapping with the security check still running in background.
      // IMPORTANT: Only generate the string — do NOT write to disk/stdout/clipboard
      // until after security confirms no suspicious files.
      const optimisticOutputPromise = withMemoryLogging('Generate Output', () =>
        deps.generateOutput(
          rootDirs,
          config,
          allProcessedFiles,
          allFilePaths,
          gitDiffResult,
          gitLogResult,
          filePathsByRoot,
          emptyDirPaths,
        ),
      );

      const metricsPromise = withMemoryLogging('Calculate Metrics', () =>
        deps.calculateMetrics(
          allProcessedFiles,
          optimisticOutputPromise,
          progressCallback,
          config,
          gitDiffResult,
          gitLogResult,
          { taskRunner: metricsTaskRunner },
        ),
      );

      // Prevent unhandled rejections if securityPromise throws before these are awaited
      optimisticOutputPromise.catch(() => {});
      metricsPromise.catch(() => {});

      // Wait for security check (runs in parallel with output generation + metrics)
      const validationResult = securityPromise ? await securityPromise : null;

      if (securityTaskRunner) {
        securityTaskRunner.cleanup().catch((error) => {
          logger.debug('Security worker pool cleanup error (non-fatal):', error);
        });
      }
      resolveSecurityResults(validationResult);

      if (suspiciousFilesResults.length > 0) {
        // Rare path: security found suspicious files — discard optimistic output and regenerate.
        logger.debug(`Security check found ${suspiciousFilesResults.length} suspicious files, regenerating output`);
        const suspiciousPathSet = new Set(suspiciousFilesResults.map((r) => r.filePath));
        processedFiles = allProcessedFiles.filter((f) => !suspiciousPathSet.has(f.path));

        // Wait for optimistic work to finish before reusing workers
        await Promise.all([optimisticOutputPromise, metricsPromise]).catch(() => {});

        const correctedOutputPromise = deps.produceOutput(
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
        const correctedOutputForMetrics = correctedOutputPromise.then((r) => r.outputForMetrics);

        [{ outputFiles }, metrics] = await Promise.all([
          correctedOutputPromise,
          deps.calculateMetrics(
            processedFiles,
            correctedOutputForMetrics,
            progressCallback,
            config,
            gitDiffResult,
            gitLogResult,
            {
              taskRunner: metricsTaskRunner,
            },
          ),
        ]);
      } else {
        // Common path: no suspicious files — write the pre-generated output.
        processedFiles = allProcessedFiles;
        const [optimisticOutput, resolvedMetrics] = await Promise.all([optimisticOutputPromise, metricsPromise]);
        metrics = resolvedMetrics;

        progressCallback('Writing output file...');
        await withMemoryLogging('Write Output', () => deps.writeOutputToDisk(optimisticOutput, config));
        await deps.copyToClipboardIfEnabled(optimisticOutput, progressCallback, config);
      }
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
    // Fire-and-forget: avoid blocking the return value on worker thread termination.
    // Worker threads are idle at this point (all tasks complete) so termination
    // is purely cleanup overhead (~100-150ms of IPC for graceful shutdown).
    // For CLI usage the process exits shortly after pack() returns, which kills
    // any remaining threads. For library/MCP usage the threads are still terminated
    // asynchronously and reclaimed by the OS.
    metricsWarmupPromise.catch(() => {});
    metricsTaskRunner.cleanup().catch((error) => {
      logger.debug('Metrics worker pool cleanup error (non-fatal):', error);
    });
    // Security cleanup: may already be done inline, safe to call again on error paths
    if (securityTaskRunner) {
      securityTaskRunner.cleanup().catch((error) => {
        logger.debug('Security worker pool cleanup error (non-fatal):', error);
      });
    }
  }
};
