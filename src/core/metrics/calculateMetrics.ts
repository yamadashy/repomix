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
    // Always calculate token counts for all files. This:
    // 1. Enables estimating total output tokens from file tokens + overhead ratio,
    //    avoiding the expensive full-output token counting (~20% faster for large repos)
    // 2. Provides per-file token data for tokenCountTree display at no extra cost
    const allFilePaths = processedFiles.map((file) => file.path);

    // Start output-independent metrics immediately so they can overlap with output generation
    // when output is passed as a promise
    const fileMetricsPromise = deps.calculateSelectiveFileMetrics(
      processedFiles,
      allFilePaths,
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

    // Build character and token counts for all files
    const fileCharCounts: Record<string, number> = {};
    const fileTokenCounts: Record<string, number> = {};
    let fileTokenSum = 0;
    let fileCharSum = 0;
    for (const file of fileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
      fileTokenSum += file.tokenCount;
    }
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
      fileCharSum += file.content.length;
    }

    // Estimate total output tokens from exact file/git token counts + structural overhead.
    // Git diff/log tokens are already exactly counted, so use those directly.
    // Only the structural overhead (headers, tree, XML/markdown tags) is estimated
    // using the average token-per-character ratio from file content.
    const resolvedGitDiffTokenCount = gitDiffTokenCount;
    const resolvedGitLogTokenCount = gitLogTokenCount.gitLogTokenCount;

    // Compute git content character lengths to separate from structural overhead
    const gitDiffChars =
      (gitDiffResult?.workTreeDiffContent?.length ?? 0) + (gitDiffResult?.stagedDiffContent?.length ?? 0);
    const gitLogChars = gitLogResult?.logContent?.length ?? 0;

    // Structural overhead = output size minus file contents and git content
    const structuralOverheadChars = Math.max(0, totalCharacters - fileCharSum - gitDiffChars - gitLogChars);
    const tokenCharRatio = fileCharSum > 0 ? fileTokenSum / fileCharSum : 0;
    const totalTokens = Math.round(
      fileTokenSum + structuralOverheadChars * tokenCharRatio + resolvedGitDiffTokenCount + resolvedGitLogTokenCount,
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
