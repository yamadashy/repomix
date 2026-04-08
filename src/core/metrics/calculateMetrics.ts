import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { getWorkerThreadCount, initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import type { MetricsTaskRunner } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { MetricsWorkerResult, MetricsWorkerTask } from './workers/calculateMetricsWorker.js';

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

export interface MetricsTaskRunnerWithWarmup {
  taskRunner: MetricsTaskRunner;
  warmupPromise: Promise<unknown>;
}

/**
 * Create a metrics task runner and warm up all worker threads by triggering
 * gpt-tokenizer initialization in parallel. This allows the expensive module
 * loading to overlap with other pipeline stages (security check, file processing,
 * output generation).
 */
export const createMetricsTaskRunner = (numOfTasks: number, encoding: TokenEncoding): MetricsTaskRunnerWithWarmup => {
  const taskRunner = initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
    numOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
  });

  const { maxThreads } = getWorkerThreadCount(numOfTasks);
  const warmupPromise = Promise.all(
    Array.from({ length: maxThreads }, () => taskRunner.run({ content: '', encoding }).catch(() => 0)),
  );

  return { taskRunner, warmupPromise };
};

const defaultDeps = {
  calculateSelectiveFileMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as MetricsTaskRunner | undefined,
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

  progressCallback('Calculating metrics...');

  // Initialize a single task runner for all metrics calculations
  const taskRunner =
    deps.taskRunner ??
    initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });

  try {
    // Determine which files to tokenize. When tokenCountTree is enabled, tokenize all
    // files for accurate per-directory aggregation. When disabled (the default), only
    // tokenize the largest files by character count — enough to identify the top-N files
    // for display and to compute an accurate token/char ratio for estimating the total.
    // This avoids tokenizing hundreds of small files that don't affect the top-N ranking,
    // reducing token counting time by ~80% for typical repos.
    const needsAllFileTokens = config.output.tokenCountTree;
    const targetFilePaths = needsAllFileTokens
      ? processedFiles.map((file) => file.path)
      : selectTopFilesBySize(processedFiles, config.output.topFilesLength);

    // Start output-independent metrics immediately so they can overlap with output generation
    // when output is passed as a promise
    const fileMetricsPromise = deps.calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      config.tokenCount.encoding,
      progressCallback,
      { taskRunner },
    );
    const gitDiffMetricsPromise = deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner });
    const gitLogMetricsPromise = deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner });

    // Prevent unhandled rejections if `await outputPromise` throws before Promise.all
    fileMetricsPromise.catch(() => {});
    gitDiffMetricsPromise.catch(() => {});
    gitLogMetricsPromise.catch(() => {});

    // Await the output (needed for total character count) and all metrics in parallel
    const [resolvedOutput, fileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      outputPromise,
      fileMetricsPromise,
      gitDiffMetricsPromise,
      gitLogMetricsPromise,
    ]);

    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];
    const totalFiles = processedFiles.length;
    const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

    // Build character counts for all files, token counts for tokenized files
    const fileCharCounts: Record<string, number> = {};
    const fileTokenCounts: Record<string, number> = {};
    let tokenizedCharSum = 0;
    let tokenizedTokenSum = 0;
    for (const file of fileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
      tokenizedTokenSum += file.tokenCount;
      tokenizedCharSum += file.charCount;
    }
    let totalFileCharSum = 0;
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
      totalFileCharSum += file.content.length;
    }

    // Estimate total output tokens from file/git token counts + structural overhead.
    // Git diff/log tokens are already exactly counted, so use those directly.
    // The structural overhead (headers, tree, XML/markdown tags) and any un-tokenized
    // files are estimated using the token/char ratio from the tokenized file sample.
    const resolvedGitDiffTokenCount = gitDiffTokenCount;
    const resolvedGitLogTokenCount = gitLogTokenCount.gitLogTokenCount;

    // Compute git content character lengths to separate from structural overhead
    const gitDiffChars =
      (gitDiffResult?.workTreeDiffContent?.length ?? 0) + (gitDiffResult?.stagedDiffContent?.length ?? 0);
    const gitLogChars = gitLogResult?.logContent?.length ?? 0;

    // Structural overhead = output size minus file contents and git content
    const structuralOverheadChars = Math.max(0, totalCharacters - totalFileCharSum - gitDiffChars - gitLogChars);
    const tokenCharRatio = tokenizedCharSum > 0 ? tokenizedTokenSum / tokenizedCharSum : 0;

    // When only a subset of files was tokenized (tokenCountTree disabled), estimate
    // tokens for un-tokenized files using the sampled ratio. When all files were
    // tokenized, untokenizedChars is 0 and this adds nothing.
    const untokenizedChars = totalFileCharSum - tokenizedCharSum;
    const totalTokens = Math.round(
      tokenizedTokenSum +
        untokenizedChars * tokenCharRatio +
        structuralOverheadChars * tokenCharRatio +
        resolvedGitDiffTokenCount +
        resolvedGitLogTokenCount,
    );

    return {
      totalFiles,
      totalCharacters,
      totalTokens,
      fileCharCounts,
      fileTokenCounts,
      gitDiffTokenCount: resolvedGitDiffTokenCount,
      gitLogTokenCount: resolvedGitLogTokenCount,
    };
  } finally {
    // Cleanup the task runner after all calculations are complete (only if we created it)
    if (!deps.taskRunner) {
      await taskRunner.cleanup();
    }
  }
};

/**
 * Select the top files by character count for tokenization. Returns enough files
 * to reliably identify the top-N by token count and compute an accurate token/char ratio.
 * Uses 10× topFilesLength (min 50) to account for token/char ratio variation across files.
 */
const selectTopFilesBySize = (processedFiles: ProcessedFile[], topFilesLength: number): string[] => {
  // Tokenize enough files to reliably capture the top-N by tokens.
  // Token count is highly correlated with char count, so 10× the display count
  // provides a generous margin for ranking accuracy.
  const targetCount = Math.max(50, topFilesLength * 10);

  if (processedFiles.length <= targetCount) {
    return processedFiles.map((f) => f.path);
  }

  // Sort by content length descending and take the top candidates
  const sorted = processedFiles
    .map((f) => ({ path: f.path, length: f.content.length }))
    .sort((a, b) => b.length - a.length);

  return sorted.slice(0, targetCount).map((f) => f.path);
};
