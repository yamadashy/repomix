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
import type { FileMetrics } from './workers/types.js';

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

// Token counting tasks are CPU-heavy (~50ms each for BPE tokenization), unlike file-processing
// tasks (<1ms each). Use a lower tasks-per-thread ratio so the pool scales up sooner,
// avoiding excessive serialization of output token chunks through a single worker.
// Cap at 3 threads: the pool is now initialized before searchFiles (not during collectFiles),
// so worker warmup overlaps with the file search phase (~300-700ms) rather than competing
// for I/O with concurrent file collection and security checks.
const METRICS_TASKS_PER_THREAD = 10;
const MAX_METRICS_WORKER_THREADS = 3;

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
    tasksPerThread: METRICS_TASKS_PER_THREAD,
    maxWorkerThreads: MAX_METRICS_WORKER_THREADS,
  });

  const { maxThreads } = getWorkerThreadCount(numOfTasks, MAX_METRICS_WORKER_THREADS, METRICS_TASKS_PER_THREAD);
  const warmupPromise = Promise.all(
    Array.from({ length: maxThreads }, () => taskRunner.run({ content: '', encoding }).catch(() => 0)),
  );

  return { taskRunner, warmupPromise };
};

// Default chars/token ratio for o200k_base encoding on typical source code.
// Used as a fallback when no file token counts are available for calibration.
const DEFAULT_CHARS_PER_TOKEN = 3.75;

/**
 * Estimate total token count from character count using a calibrated chars/token ratio.
 *
 * Instead of tokenizing the entire output string (~450ms CPU for a 4MB output),
 * we use the chars/token ratio observed from the files we already tokenize
 * (selective file metrics) to estimate the output token count. This eliminates
 * the single largest CPU task in the metrics pipeline.
 *
 * The top files by character count (our sample) tend to have a slightly higher
 * chars/token ratio than smaller files (e.g., large docs/tests use more prose
 * while small source files are denser). To correct this bias, the sample ratio
 * is blended with the default ratio, weighted by how much of the total file
 * content the sample covers. When coverage is high (sample is representative),
 * the sample ratio dominates; when low, the default acts as a prior.
 *
 * Accuracy: typically within 1-2% of exact tokenization on real-world repos.
 */
const estimateTokenCount = (
  totalOutputChars: number,
  fileMetrics: FileMetrics[],
  processedFiles: ProcessedFile[],
): number => {
  if (totalOutputChars === 0) return 0;

  // Calibrate from the files we already tokenized
  let sampleChars = 0;
  let sampleTokens = 0;
  for (const file of fileMetrics) {
    sampleChars += file.charCount;
    sampleTokens += file.tokenCount;
  }

  if (sampleTokens === 0) {
    return Math.round(totalOutputChars / DEFAULT_CHARS_PER_TOKEN);
  }

  const sampleRatio = sampleChars / sampleTokens;

  // Compute what fraction of total file content our sample covers
  let totalFileChars = 0;
  for (const file of processedFiles) {
    totalFileChars += file.content.length;
  }

  if (totalFileChars === 0) {
    return Math.round(totalOutputChars / sampleRatio);
  }

  // Blend sample ratio with the default, weighted by coverage.
  // High coverage → trust the sample more; low coverage → rely on the default.
  const coverage = Math.min(sampleChars / totalFileChars, 1.0);
  const blendedRatio = sampleRatio * coverage + DEFAULT_CHARS_PER_TOKEN * (1 - coverage);

  return Math.round(totalOutputChars / blendedRatio);
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
      tasksPerThread: METRICS_TASKS_PER_THREAD,
      maxWorkerThreads: MAX_METRICS_WORKER_THREADS,
    });

  try {
    // For top files display optimization: calculate token counts only for top files by character count
    // However, if tokenCountTree is enabled, calculate for all files to avoid double calculation
    const topFilesLength = config.output.topFilesLength;
    const shouldCalculateAllFiles = !!config.output.tokenCountTree;

    // Determine which files to calculate token counts for:
    // - If tokenCountTree is enabled: calculate for all files to avoid double calculation
    // - Otherwise: calculate only for top files by character count for optimization
    const metricsTargetPaths = shouldCalculateAllFiles
      ? processedFiles.map((file) => file.path)
      : [...processedFiles]
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
          .map((file) => file.path);

    // Start output-independent metrics immediately so they can overlap with output generation
    // when output is passed as a promise
    const selectiveFileMetricsPromise = deps.calculateSelectiveFileMetrics(
      processedFiles,
      metricsTargetPaths,
      config.tokenCount.encoding,
      progressCallback,
      { taskRunner },
    );
    const gitDiffMetricsPromise = deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner });
    const gitLogMetricsPromise = deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner });

    // Wait for output, file metrics, and git metrics in parallel.
    // Output is needed only for character counting — token counting is estimated
    // from the calibrated chars/token ratio of the selectively tokenized files,
    // avoiding ~450ms of CPU-heavy BPE tokenization on the full output string.
    const [resolvedOutput, selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      outputPromise,
      selectiveFileMetricsPromise,
      gitDiffMetricsPromise,
      gitLogMetricsPromise,
    ]);

    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];
    const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);
    const totalTokens = estimateTokenCount(totalCharacters, selectiveFileMetrics, processedFiles);
    const totalFiles = processedFiles.length;

    // Build character counts for all files
    const fileCharCounts: Record<string, number> = {};
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
    }

    // Build token counts only for top files
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
