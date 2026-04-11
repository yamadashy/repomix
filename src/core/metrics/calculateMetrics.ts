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
export const MAX_METRICS_WORKER_THREADS = 3;

// Multiplier applied to topFilesLength to determine how many files are exact-tokenized.
// The first `topFilesLength` files are surfaced to the user; the remainder act as a
// calibration sample for the chars-per-token ratio used to estimate the rest of the repo.
// See the comment inside calculateMetrics() for the accuracy/perf tradeoff.
export const CALIBRATION_SAMPLE_MULTIPLIER = 3;

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
 * Compute a calibrated chars/token ratio from a sample of exact-tokenized files,
 * blended with the default ratio weighted by how representative the sample is.
 *
 * The top files by character count (our sample) tend to have a slightly higher
 * chars/token ratio than smaller files (e.g., large docs/tests use more prose
 * while small source files are denser). To correct this bias, the sample ratio
 * is blended with the default ratio, weighted by how much of the total file
 * content the sample covers. When coverage is high (sample is representative),
 * the sample ratio dominates; when low, the default acts as a prior.
 */
const estimateCharsPerToken = (fileMetrics: FileMetrics[], processedFiles: ProcessedFile[]): number => {
  let sampleChars = 0;
  let sampleTokens = 0;
  for (const file of fileMetrics) {
    sampleChars += file.charCount;
    sampleTokens += file.tokenCount;
  }

  if (sampleTokens === 0) {
    return DEFAULT_CHARS_PER_TOKEN;
  }

  const sampleRatio = sampleChars / sampleTokens;

  let totalFileChars = 0;
  for (const file of processedFiles) {
    totalFileChars += file.content.length;
  }

  if (totalFileChars === 0) {
    return sampleRatio;
  }

  const coverage = Math.min(sampleChars / totalFileChars, 1.0);
  return sampleRatio * coverage + DEFAULT_CHARS_PER_TOKEN * (1 - coverage);
};

/**
 * Estimate total token count from character count using a calibrated chars/token ratio.
 *
 * Instead of tokenizing the entire output string (~450ms CPU for a 4MB output),
 * we use the chars/token ratio observed from the files we already tokenize
 * (selective file metrics) to estimate the output token count. This eliminates
 * the single largest CPU task in the metrics pipeline.
 *
 * Accuracy: typically within 1-2% of exact tokenization on real-world repos.
 */
const estimateTokenCount = (
  totalOutputChars: number,
  fileMetrics: FileMetrics[],
  processedFiles: ProcessedFile[],
): number => {
  if (totalOutputChars === 0) return 0;
  return Math.round(totalOutputChars / estimateCharsPerToken(fileMetrics, processedFiles));
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
    // Always calculate exact token counts only for the top files by character count.
    // When tokenCountTree is enabled, remaining files get estimated token counts
    // using the calibrated chars/token ratio from the exact-tokenized sample.
    // This avoids BPE-tokenizing every file while keeping exact counts for the
    // largest files (most likely to individually cross thresholds). Directory token
    // sums remain accurate to within ~2% of exact tokenization.
    //
    // The sample multiplier (CALIBRATION_SAMPLE_MULTIPLIER) trades off calibration
    // accuracy for tokenization wall time. A higher multiplier covers more of the
    // total file content (better calibration) but proportionally increases the
    // BPE work performed in worker threads, which is the dominant pole on the
    // critical path. Empirically, x3 covers ~58% of repo content and keeps the
    // totalTokens estimate within ~3% of exact tokenization on real repos, while
    // saving ~80ms wall time vs x10 on a 1000-file repo (single-worker BPE bound).
    const topFilesLength = config.output.topFilesLength;

    const metricsTargetPaths = [...processedFiles]
      .sort((a, b) => b.content.length - a.content.length)
      .slice(0, Math.min(processedFiles.length, topFilesLength * CALIBRATION_SAMPLE_MULTIPLIER))
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

    // Build token counts: exact for selectively tokenized files, estimated for the rest
    const fileTokenCounts: Record<string, number> = {};
    const exactTokenizedPaths = new Set<string>();
    for (const file of selectiveFileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
      exactTokenizedPaths.add(file.path);
    }

    // When tokenCountTree is enabled, estimate token counts for remaining files
    // using the calibrated chars/token ratio from the exact-tokenized sample.
    // Per-file estimates have higher variance (~12% median error) but directory
    // token sums are accurate to ~2% due to error cancellation across many files.
    if (config.output.tokenCountTree && processedFiles.length > exactTokenizedPaths.size) {
      const charsPerToken = estimateCharsPerToken(selectiveFileMetrics, processedFiles);
      for (const file of processedFiles) {
        if (!exactTokenizedPaths.has(file.path)) {
          fileTokenCounts[file.path] = Math.round(file.content.length / charsPerToken);
        }
      }
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
