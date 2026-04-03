import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateMetricsOnMainThread } from './calculateMetricsMainThread.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import { type CalculateMetricsResult, estimateOutputTokens, getGitDiffChars, getGitLogChars } from './metricsUtils.js';
import type { TokenCountBatchTask, TokenCountTask } from './workers/calculateMetricsWorker.js';

export type { CalculateMetricsResult } from './metricsUtils.js';

export type MetricsWorkerTask = TokenCountTask | TokenCountBatchTask;
export type MetricsWorkerResult = number | number[];

/**
 * Create a metrics task runner that can be pre-initialized to overlap
 * gpt-tokenizer loading with other pipeline stages.
 */
export const createMetricsTaskRunner = (numOfTasks: number): TaskRunner<MetricsWorkerTask, MetricsWorkerResult> => {
  return initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
    numOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
  });
};

/**
 * A synchronous token counting function loaded on the main thread.
 * When provided, metrics calculation runs on the main thread instead of worker
 * threads, eliminating ~240ms of worker cold-start + module-loading overhead.
 */
export type CountTokensFn = (text: string, options?: { disallowedSpecial?: Set<string> }) => number;

const defaultDeps = {
  calculateSelectiveFileMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as TaskRunner<MetricsWorkerTask, MetricsWorkerResult> | undefined,
  countTokens: undefined as CountTokensFn | undefined,
};

/**
 * Select which files should get full BPE tokenization when tokenCountTree is enabled.
 * Files are sorted by content size (descending) and the largest files that account for
 * BPE_CONTENT_THRESHOLD (80%) of total content are selected. Remaining files will use
 * character-ratio estimation, which is accurate enough for directory-level aggregation
 * in the token count tree display.
 */
const BPE_CONTENT_THRESHOLD = 0.8;

const selectBpeTargetFiles = (processedFiles: ProcessedFile[]): string[] => {
  const totalChars = processedFiles.reduce((sum, f) => sum + f.content.length, 0);
  if (totalChars === 0) {
    return [];
  }

  const targetChars = totalChars * BPE_CONTENT_THRESHOLD;
  const sorted = [...processedFiles].sort((a, b) => b.content.length - a.content.length);

  const targetPaths: string[] = [];
  let cumulativeChars = 0;

  for (const file of sorted) {
    targetPaths.push(file.path);
    cumulativeChars += file.content.length;
    if (cumulativeChars >= targetChars) {
      break;
    }
  }

  return targetPaths;
};

/**
 * Fill in estimated token counts for files that were not BPE-counted.
 * Uses the chars-per-token ratio derived from BPE-counted files. Mutates fileTokenCounts.
 */
const estimateUncountedFileTokens = (
  processedFiles: ProcessedFile[],
  fileTokenCounts: Record<string, number>,
): void => {
  let countedChars = 0;
  let countedTokens = 0;

  for (const file of processedFiles) {
    const tokens = fileTokenCounts[file.path];
    if (tokens !== undefined) {
      countedChars += file.content.length;
      countedTokens += tokens;
    }
  }

  const charsPerToken = countedTokens > 0 ? countedChars / countedTokens : 4.0;

  for (const file of processedFiles) {
    if (fileTokenCounts[file.path] === undefined) {
      fileTokenCounts[file.path] = Math.round(file.content.length / charsPerToken);
    }
  }
};

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  outputPromise: Promise<string | string[]>,
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  overrideDeps: Partial<typeof defaultDeps> = {},
): Promise<CalculateMetricsResult> => {
  const deps = { ...defaultDeps, ...overrideDeps };
  const shouldCalculateAllFiles = !!config.output.tokenCountTree;

  // When a main-thread countTokens function is available and we don't need
  // to tokenize all files (tokenCountTree off), run tokenization directly on
  // the main thread. This eliminates ~240ms of worker thread cold-start and
  // gpt-tokenizer module-loading overhead that otherwise extends the critical
  // path, since the tokenizer module is pre-loaded during the file pipeline.
  if (deps.countTokens && !shouldCalculateAllFiles) {
    return calculateMetricsOnMainThread(
      processedFiles,
      outputPromise,
      progressCallback,
      config,
      gitDiffResult,
      gitLogResult,
      deps.countTokens,
    );
  }

  return calculateMetricsWithWorkers(
    processedFiles,
    outputPromise,
    progressCallback,
    config,
    gitDiffResult,
    gitLogResult,
    deps,
  );
};

/**
 * Worker-thread tokenization path. Used when tokenCountTree is enabled (requires
 * tokenizing many/all files) or when no main-thread countTokens is available.
 */
const calculateMetricsWithWorkers = async (
  processedFiles: ProcessedFile[],
  outputPromise: Promise<string | string[]>,
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  deps: typeof defaultDeps,
): Promise<CalculateMetricsResult> => {
  progressCallback('Calculating metrics...');

  const taskRunner =
    deps.taskRunner ??
    initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });

  try {
    const topFilesLength = config.output.topFilesLength;
    const shouldCalculateAllFiles = !!config.output.tokenCountTree;

    let metricsTargetPaths: string[];

    if (shouldCalculateAllFiles) {
      metricsTargetPaths = selectBpeTargetFiles(processedFiles);
    } else {
      metricsTargetPaths = [...processedFiles]
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
        .map((file) => file.path);
    }

    const selectiveFileMetricsPromise = deps.calculateSelectiveFileMetrics(
      processedFiles,
      metricsTargetPaths,
      config.tokenCount.encoding,
      progressCallback,
      { taskRunner },
    );
    const gitDiffMetricsPromise = deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner });
    const gitLogMetricsPromise = deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner });

    selectiveFileMetricsPromise.catch(() => {});
    gitDiffMetricsPromise.catch(() => {});
    gitLogMetricsPromise.catch(() => {});

    const [resolvedOutput, selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      outputPromise,
      selectiveFileMetricsPromise,
      gitDiffMetricsPromise,
      gitLogMetricsPromise,
    ]);

    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];
    const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

    const fileCharCounts: Record<string, number> = {};
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
    }

    const fileTokenCounts: Record<string, number> = {};
    for (const file of selectiveFileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
    }

    if (shouldCalculateAllFiles) {
      estimateUncountedFileTokens(processedFiles, fileTokenCounts);
    }

    const totalTokens = estimateOutputTokens(
      processedFiles,
      fileTokenCounts,
      totalCharacters,
      gitDiffTokenCount,
      gitLogTokenCount.gitLogTokenCount,
      getGitDiffChars(gitDiffResult),
      getGitLogChars(gitLogResult),
    );

    return {
      totalFiles: processedFiles.length,
      totalCharacters,
      totalTokens,
      fileCharCounts,
      fileTokenCounts,
      gitDiffTokenCount: gitDiffTokenCount,
      gitLogTokenCount: gitLogTokenCount.gitLogTokenCount,
    };
  } finally {
    if (!deps.taskRunner) {
      await taskRunner.cleanup();
    }
  }
};
