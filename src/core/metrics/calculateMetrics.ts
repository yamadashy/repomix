import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { getProcessConcurrency, getWorkerThreadCount, initTaskRunner } from '../../shared/processConcurrency.js';
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
  // Use all available cores for metrics workers. The security check worker (1 thread)
  // may still be running during the early overlap phase, but it finishes quickly and
  // the brief oversubscription is outweighed by higher sustained throughput for the
  // token counting workload that dominates total execution time.
  const maxMetricsWorkers = Math.max(1, getProcessConcurrency());
  const cappedNumOfTasks = Math.min(numOfTasks, maxMetricsWorkers * 100);
  const taskRunner = initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
    numOfTasks: cappedNumOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
  });

  // Warm up all worker threads to eliminate lazy initialization delays during the
  // metrics phase. While warmup overlaps with security check workers (causing some
  // CPU contention), having all workers ready when metrics calculation starts
  // outweighs the contention cost: lazy initialization on cold workers adds ~150ms
  // per worker during the metrics phase, which is worse than the brief contention
  // during warmup when I/O-bound pipeline stages provide natural CPU headroom.
  const { maxThreads } = getWorkerThreadCount(cappedNumOfTasks);
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
    // Always tokenize all files individually. This enables computing the output
    // total token count from the sum of file tokens plus template overhead,
    // avoiding a redundant full-output tokenization pass (~3-4MB) that otherwise
    // dominates metrics time. The per-file token counts are also needed when
    // tokenCountTree is enabled and are useful for the top-files display.
    const allFilePaths = processedFiles.map((file) => file.path);

    // Start output-independent metrics immediately so they can overlap with output generation
    // when output is passed as a promise
    const selectiveFileMetricsPromise = deps.calculateSelectiveFileMetrics(
      processedFiles,
      allFilePaths,
      config.tokenCount.encoding,
      progressCallback,
      { taskRunner },
    );
    const gitDiffMetricsPromise = deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner });
    const gitLogMetricsPromise = deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner });

    // Prevent unhandled rejections if `await outputPromise` throws before Promise.all
    selectiveFileMetricsPromise.catch(() => {});
    gitDiffMetricsPromise.catch(() => {});
    gitLogMetricsPromise.catch(() => {});

    // Await the output (waits for output generation to complete)
    const resolvedOutput = await outputPromise;
    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];

    const [selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      selectiveFileMetricsPromise,
      gitDiffMetricsPromise,
      gitLogMetricsPromise,
    ]);

    // Compute output total token count from individual file tokens + template overhead.
    // This avoids tokenizing the full output (which is mostly the same file contents
    // already tokenized above). The template overhead (XML tags, headers, tree structure)
    // is estimated using the char-to-token ratio derived from the file contents.
    // This approach is comparable in accuracy to the previous chunk-based output
    // tokenization, which also introduced boundary effects by splitting at arbitrary
    // 200KB positions.
    const totalFileTokens = selectiveFileMetrics.reduce((sum, m) => sum + m.tokenCount, 0);
    const totalFileChars = processedFiles.reduce((sum, f) => sum + f.content.length, 0);
    const totalOutputChars = outputParts.reduce((sum, part) => sum + part.length, 0);
    // Guard against negative overhead (e.g., if output truncates content or
    // entity-encoding inflates chars asymmetrically in parsableStyle mode).
    const overheadChars = Math.max(0, totalOutputChars - totalFileChars);
    // Default ratio 0.25 tokens/char is a conservative estimate for template
    // markup when no file content is available to derive the ratio.
    const charToTokenRatio = totalFileChars > 0 ? totalFileTokens / totalFileChars : 0.25;
    const overheadTokens = Math.round(overheadChars * charToTokenRatio);
    const totalTokens = totalFileTokens + overheadTokens;

    const totalFiles = processedFiles.length;
    const totalCharacters = totalOutputChars;

    // Build character counts for all files
    const fileCharCounts: Record<string, number> = {};
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
    }

    // Build token counts for all files
    const fileTokenCounts: Record<string, number> = {};
    for (const file of selectiveFileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
    }

    return {
      totalFiles,
      totalCharacters,
      totalTokens,
      fileCharCounts,
      fileTokenCounts,
      gitDiffTokenCount: gitDiffTokenCount,
      gitLogTokenCount: gitLogTokenCount.gitLogTokenCount,
    };
  } finally {
    // Cleanup the task runner after all calculations are complete (only if we created it)
    if (!deps.taskRunner) {
      await taskRunner.cleanup();
    }
  }
};
