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
    // Determine which files to tokenize based on the tokenCountTree setting:
    //
    // - boolean true: tokenize ALL files (no threshold, every file shown in tree)
    // - number (threshold): only tokenize files that could plausibly exceed the
    //   threshold. Files below a conservative char-based cutoff are estimated using
    //   the token/char ratio from the tokenized sample. This avoids tokenizing
    //   hundreds of small files that would be filtered from the tree display anyway,
    //   reducing tokenization time by ~90% for typical repos with a threshold.
    // - false/undefined: tokenize top-N files by size for ranking + ratio estimation
    const tokenCountTree = config.output.tokenCountTree;
    const tokenThreshold = typeof tokenCountTree === 'number' ? tokenCountTree : 0;
    const targetFilePaths =
      tokenCountTree === true
        ? processedFiles.map((file) => file.path)
        : tokenThreshold > 0
          ? selectFilesAboveThreshold(processedFiles, tokenThreshold)
          : tokenCountTree
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

    // When tokenCountTree is a threshold number, fill in estimated token counts
    // for files that were skipped (below char threshold). This ensures directory
    // aggregation in the token count tree includes all files.
    if (typeof tokenCountTree === 'number' && tokenizedCharSum > 0) {
      const ratio = tokenizedTokenSum / tokenizedCharSum;
      for (const file of processedFiles) {
        if (!(file.path in fileTokenCounts)) {
          fileTokenCounts[file.path] = Math.round(file.content.length * ratio);
        }
      }
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
 * Select files whose character count is high enough that they could plausibly exceed
 * the token threshold. Uses a conservative upper bound on chars-per-token (5) to avoid
 * false negatives — even very sparse code rarely exceeds 5 chars per token, so any
 * file with fewer than threshold × 5 chars cannot reach the token threshold.
 *
 * Always includes at least the top 50 files by size (same as the default path) to
 * ensure a reliable token/char ratio for estimating un-tokenized files.
 */
const selectFilesAboveThreshold = (processedFiles: ProcessedFile[], tokenThreshold: number): string[] => {
  // Upper bound on chars per token. Typical code averages 3–4 chars/token (0.25–0.33
  // tokens/char). Using 5 chars/token as the ceiling ensures we don't miss any file
  // that could plausibly reach the threshold.
  const MAX_CHARS_PER_TOKEN = 5;
  const charThreshold = tokenThreshold * MAX_CHARS_PER_TOKEN;

  const aboveThreshold = new Set<string>();
  const sorted: { path: string; length: number }[] = [];

  for (const file of processedFiles) {
    const len = file.content.length;
    if (len >= charThreshold) {
      aboveThreshold.add(file.path);
    }
    sorted.push({ path: file.path, length: len });
  }

  // Always include the top 50 files by size for ratio estimation accuracy,
  // even if they're below the threshold.
  sorted.sort((a, b) => b.length - a.length);
  const minSample = 50;
  for (let i = 0; i < Math.min(minSample, sorted.length); i++) {
    aboveThreshold.add(sorted[i].path);
  }

  return [...aboveThreshold];
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
