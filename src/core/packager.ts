import path from 'node:path';
import type { RepomixConfigMerged } from '../config/configSchema.js';
import { logMemoryUsage, withMemoryLogging } from '../shared/memoryUtils.js';
import { getProcessConcurrency, initTaskRunner, type TaskRunner } from '../shared/processConcurrency.js';
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
import { calculateOutputMetrics } from './metrics/calculateOutputMetrics.js';
import { calculateSelectiveFileMetrics, type SelectiveMetricsResult } from './metrics/calculateSelectiveFileMetrics.js';
import { preloadTokenEncoding } from './metrics/tokenEncoding.js';
import { generateOutput } from './output/outputGenerate.js';
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
  calculateOutputMetrics,
  generateOutput,
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

  // Pre-initialize security worker pool BEFORE file search so worker threads start loading
  // @secretlint modules while file search (globby) runs (~170ms of I/O). This overlaps
  // module loading with search I/O, giving workers ~300ms total to initialize
  // (search + collection time) instead of just ~130ms (collection time only).
  //
  // Uses an estimated task count since the actual file count is unknown before search.
  // For repos with >100 files (the common case), thread count equals maxConcurrency
  // regardless of exact file count. For tiny repos, the extra idle thread is negligible.
  //
  // Cap worker threads at (cpus - 2) to reduce CPU contention with main-thread token
  // counting that runs in parallel. On a 4-core machine, this prevents 5 threads (4 workers
  // + main) from competing for 4 cores. Reserving cores for the main thread and OS/GC
  // improves overall throughput despite fewer security workers.
  const securityMaxConcurrency = Math.max(1, getProcessConcurrency() - 2);
  const estimatedTaskCount = securityMaxConcurrency * 100;
  const securityTaskRunner = config.security.enableSecurityCheck
    ? deps.initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
        numOfTasks: estimatedTaskCount,
        workerType: 'securityCheck',
        runtime: 'worker_threads',
        maxConcurrency: securityMaxConcurrency,
      })
    : undefined;

  // Preload gpt-tokenizer encoding module during file search so it's cached by the time
  // token counting starts. The module load is synchronous (require), so we trigger it
  // here to overlap with the async file search I/O below.
  preloadTokenEncoding(config.tokenCount.encoding);

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

  // Build filePathsByRoot early so speculative output generation can use it
  const filePathsByRoot: FilesByRoot[] = sortedFilePathsByDir.map(({ rootDir, filePaths }) => ({
    rootLabel: path.basename(rootDir) || rootDir,
    files: filePaths,
  }));

  // Determine if speculative output generation is possible.
  // Skill generation and split output require special handling that can't be speculated.
  const isSkillGeneration = config.skillGenerate !== undefined && options.skillDir;
  const isSplitOutput = config.output.splitOutput !== undefined;
  const canSpeculate = !isSkillGeneration && !isSplitOutput;

  // Run security check and file processing in parallel since they are independent.
  // Processing all files (including potentially suspicious ones) is safe because
  // file processing only performs text transformations (comment removal, formatting).
  // Suspicious files are filtered out after both operations complete.
  //
  // Additionally, once file processing completes (typically faster than security check),
  // start file metrics calculation immediately to utilize the otherwise-idle main thread
  // while security workers continue running. After file metrics complete, speculatively
  // generate output and count its tokens — this converts idle main-thread time
  // (between file metrics completion and security check completion) into useful work,
  // eliminating output token counting from the critical path.
  progressCallback('Running security check and processing files...');
  let securityResult: Awaited<ReturnType<typeof deps.validateFileSafety>>;
  let allProcessedFiles: ProcessedFile[];
  let fileMetricsPromise: Promise<SelectiveMetricsResult> | undefined;
  let speculativeOutputPromise: Promise<string> | undefined;
  let speculativeOutputTokensPromise: Promise<number> | undefined;
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
          // Counts tokens for ALL files to get totalFileTokens (used to derive output token
          // count via skeleton approach) while tracking per-file metrics for target files only.
          const metricsTargetPaths = getMetricsTargetPaths(processed, config);
          fileMetricsPromise = deps.calculateSelectiveFileMetrics(
            processed,
            metricsTargetPaths,
            config.tokenCount.encoding,
            progressCallback,
          );
          fileMetricsPromise.catch(() => {});

          // Speculative output generation: after file metrics complete (which runs
          // synchronously on the main thread), generate output and derive its token count.
          // Instead of re-tokenizing the full output string (~370ms), derive the count from
          // totalFileTokens + skeleton formatting tokens (~10ms). The skeleton output is
          // generated with empty file contents to isolate formatting tokens (headers, tags,
          // file tree). Measured accuracy: 0.02% error (~237 tokens out of ~980K).
          if (canSpeculate) {
            speculativeOutputPromise = fileMetricsPromise.then(() =>
              deps.generateOutput(
                rootDirs,
                config,
                processed,
                allFilePaths,
                gitDiffResult,
                gitLogResult,
                filePathsByRoot,
                allEmptyDirPaths,
              ),
            );
            speculativeOutputPromise.catch(() => {});

            // Derive output token count: totalFileTokens + skeleton formatting tokens
            const metricsForTokens = fileMetricsPromise;
            speculativeOutputTokensPromise = speculativeOutputPromise.then(async () => {
              const metricsResult = await metricsForTokens;
              const skeletonFiles = processed.map((f) => ({ ...f, content: '' }));
              const skeletonOutput = await deps.generateOutput(
                rootDirs,
                config,
                skeletonFiles,
                allFilePaths,
                gitDiffResult,
                gitLogResult,
                filePathsByRoot,
                allEmptyDirPaths,
              );
              const skeletonTokens = await deps.calculateOutputMetrics(
                skeletonOutput,
                config.tokenCount.encoding,
                config.output.filePath,
              );
              return metricsResult.totalFileTokens + skeletonTokens;
            });
            speculativeOutputTokensPromise.catch(() => {});
          }

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
  if (isSkillGeneration) {
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

  // Determine if speculative output can be reused:
  // - No suspicious files were found (speculative output used unfiltered files)
  // - Not split output mode (handled separately)
  // - Speculative output was actually started
  const useSpeculativeOutput = speculativeOutputPromise && suspiciousPathSet.size === 0;

  let outputFiles: string[] | undefined;
  let outputForMetrics: string | string[];

  if (useSpeculativeOutput && speculativeOutputPromise) {
    // Reuse speculative output — it was generated with all processedFiles,
    // and security check confirmed no files need filtering.
    const output = await speculativeOutputPromise;
    await deps.produceOutput(
      rootDirs,
      config,
      processedFiles,
      allFilePaths,
      gitDiffResult,
      gitLogResult,
      progressCallback,
      filePathsByRoot,
      allEmptyDirPaths,
      {},
      { precomputedOutput: output },
    );
    outputForMetrics = output;
  } else {
    // Normal flow: generate output from scratch (suspicious files filtered, or split mode)
    const result = await deps.produceOutput(
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
    outputFiles = result.outputFiles;
    outputForMetrics = result.outputForMetrics;
  }

  // Calculate remaining metrics on main thread, reusing precomputed file metrics
  // and speculative output tokens from the security check phase.
  const metrics = await withMemoryLogging('Calculate Metrics', () =>
    deps.calculateMetrics(processedFiles, outputForMetrics, progressCallback, config, gitDiffResult, gitLogResult, {
      precomputedFileMetrics: fileMetricsPromise,
      precomputedOutputTokens: useSpeculativeOutput ? speculativeOutputTokensPromise : undefined,
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
