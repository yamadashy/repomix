import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount, initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchTask } from './workers/calculateMetricsWorker.js';

// Output sampling constants for token count estimation.
// For large outputs (> threshold), we count tokens on evenly spaced samples
// and extrapolate, avoiding full BPE tokenization of the entire output.
const OUTPUT_SAMPLING_THRESHOLD = 500_000; // 500KB - outputs below this are fully tokenized
const OUTPUT_SAMPLE_SIZE = 100_000; // 100KB per sample
const OUTPUT_SAMPLE_COUNT = 10; // Max samples (up to 1MB total = ~25% of a 4MB output)

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
  taskRunner: TaskRunner<TokenCountBatchTask, number[]>;
  warmupPromise: Promise<unknown>;
}

/**
 * Create a metrics task runner and warm up all worker threads by triggering
 * gpt-tokenizer initialization in parallel. This allows the expensive module
 * loading to overlap with other pipeline stages (security check, file processing,
 * output generation).
 */
export const createMetricsTaskRunner = (numOfTasks: number, encoding: TokenEncoding): MetricsTaskRunnerWithWarmup => {
  const taskRunner = initTaskRunner<TokenCountBatchTask, number[]>({
    numOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
  });

  const { maxThreads } = getWorkerThreadCount(numOfTasks);
  const warmupPromise = Promise.all(
    Array.from({ length: maxThreads }, () => taskRunner.run({ items: [{ content: '', encoding }] }).catch(() => [0])),
  );

  return { taskRunner, warmupPromise };
};

const defaultDeps = {
  calculateSelectiveFileMetrics,
  calculateOutputMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as TaskRunner<TokenCountBatchTask, number[]> | undefined,
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
    initTaskRunner<TokenCountBatchTask, number[]>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
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

    // Prevent unhandled rejections if `await outputPromise` throws before Promise.all
    selectiveFileMetricsPromise.catch(() => {});
    gitDiffMetricsPromise.catch(() => {});
    gitLogMetricsPromise.catch(() => {});

    // Await the output (waits for output generation to complete)
    const resolvedOutput = await outputPromise;
    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];

    let totalTokens: number;
    let selectiveFileMetrics: Awaited<ReturnType<typeof deps.calculateSelectiveFileMetrics>>;
    let gitDiffTokenCount: number;
    let gitLogTokenCount: Awaited<ReturnType<typeof deps.calculateGitLogMetrics>>;

    // When all files are individually tokenized (tokenCountTree enabled) and output is
    // a single part, estimate output tokens from file token sums instead of re-tokenizing
    // the entire output. The output is mostly file contents wrapped in template markup,
    // so output_tokens ≈ sum(file_tokens) + overhead_tokens. The overhead tokens are
    // estimated using the same chars-per-token ratio observed in the file content.
    // This avoids ~200ms of redundant tokenization on the worker pool.
    if (shouldCalculateAllFiles && outputParts.length === 1) {
      // Wait for file metrics first (needed for the estimate)
      [selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
        selectiveFileMetricsPromise,
        gitDiffMetricsPromise,
        gitLogMetricsPromise,
      ]);

      const totalFileTokens = selectiveFileMetrics.reduce((sum, f) => sum + f.tokenCount, 0);
      const totalFileChars = processedFiles.reduce((sum, f) => sum + f.content.length, 0);

      if (totalFileTokens > 0 && totalFileChars > 0) {
        const outputChars = outputParts[0].length;
        const overheadChars = outputChars - totalFileChars;
        const charsPerToken = totalFileChars / totalFileTokens;
        const overheadTokens = Math.max(0, Math.round(overheadChars / charsPerToken));
        totalTokens = totalFileTokens + overheadTokens;
        logger.trace(
          `Estimated output tokens from file metrics: ${totalTokens} (file: ${totalFileTokens}, overhead: ${overheadTokens})`,
        );
      } else {
        // Edge case: no file content, fall back to full tokenization
        const outputTokenCounts = await Promise.all(
          outputParts.map((part) =>
            deps.calculateOutputMetrics(part, config.tokenCount.encoding, config.output.filePath, { taskRunner }),
          ),
        );
        totalTokens = outputTokenCounts.reduce((sum, count) => sum + count, 0);
      }
    } else if (outputParts.length === 1 && outputParts[0].length > OUTPUT_SAMPLING_THRESHOLD) {
      // Large single output: estimate total tokens by sampling evenly spaced portions
      // of the output and extrapolating. This is more accurate than file-ratio estimation
      // because it captures the actual output structure (XML tags, headers, tree) alongside
      // file contents. Accuracy is typically within 1-2%. Saves ~150-200ms of BPE work.
      const output = outputParts[0];
      const sampleCount = Math.min(OUTPUT_SAMPLE_COUNT, Math.ceil(output.length / OUTPUT_SAMPLE_SIZE));
      const stride = Math.floor(output.length / sampleCount);

      const sampleItems = Array.from({ length: sampleCount }, (_, i) => ({
        content: output.slice(i * stride, i * stride + OUTPUT_SAMPLE_SIZE),
        encoding: config.tokenCount.encoding,
        path: `${config.output.filePath}-sample-${i}`,
      }));

      const samplePromise = taskRunner.run({ items: sampleItems });

      [selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
        selectiveFileMetricsPromise,
        gitDiffMetricsPromise,
        gitLogMetricsPromise,
      ]);

      const sampleResults = await samplePromise;
      const sampleTokens = sampleResults.reduce((sum, count) => sum + count, 0);
      const sampleChars = sampleItems.reduce((sum, item) => sum + item.content.length, 0);

      if (sampleTokens > 0 && sampleChars > 0) {
        totalTokens = Math.round((output.length / sampleChars) * sampleTokens);
        logger.trace(
          `Estimated output tokens from ${sampleCount} samples: ${totalTokens} (${(sampleChars / sampleTokens).toFixed(2)} chars/token)`,
        );
      } else {
        totalTokens = 0;
      }
    } else {
      // Multi-part (split) output: tokenize each output part via workers
      const outputMetricsPromise = Promise.all(
        outputParts.map((part, index) => {
          const partPath =
            outputParts.length > 1
              ? buildSplitOutputFilePath(config.output.filePath, index + 1)
              : config.output.filePath;
          return deps.calculateOutputMetrics(part, config.tokenCount.encoding, partPath, { taskRunner });
        }),
      );

      let outputTokenCounts: number[];
      [selectiveFileMetrics, outputTokenCounts, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
        selectiveFileMetricsPromise,
        outputMetricsPromise,
        gitDiffMetricsPromise,
        gitLogMetricsPromise,
      ]);
      totalTokens = outputTokenCounts.reduce((sum, count) => sum + count, 0);
    }

    const totalFiles = processedFiles.length;
    const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

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
      gitDiffTokenCount,
      gitLogTokenCount: gitLogTokenCount.gitLogTokenCount,
    };
  } finally {
    // Cleanup the task runner after all calculations are complete (only if we created it)
    if (!deps.taskRunner) {
      // Fire-and-forget: worker threads are idle (all tasks complete).
      taskRunner.cleanup().catch((error) => {
        logger.debug('Metrics worker pool cleanup error (non-fatal):', error);
      });
    }
  }
};
