import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount, initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import { type MetricsTaskRunner, runTokenCount } from './metricsWorkerRunner.js';
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
  calculateOutputMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as MetricsTaskRunner | undefined,
};

/**
 * Extract the "wrapper" portion of a generated output: the output string minus
 * every file's content. Returns `null` if any file's content cannot be located
 * in the output (e.g., the template escaped it, the output was split, or the
 * processedFiles order does not match the output order).
 *
 * Assumes `processedFilesInOutputOrder` lists files in the same order they
 * appear in `output`. A single forward pass with `indexOf(content, cursor)`
 * is enough and handles identical content between files (each occurrence is
 * consumed in order).
 */
const extractOutputWrapper = (
  output: string,
  processedFilesInOutputOrder: ReadonlyArray<ProcessedFile>,
): string | null => {
  const wrapperSegments: string[] = [];
  let cursor = 0;
  for (const file of processedFilesInOutputOrder) {
    // Empty file contents produce no occurrence in the output, so skip them
    // (their contribution to sum-of-file-tokens is zero anyway).
    if (file.content.length === 0) continue;

    const idx = output.indexOf(file.content, cursor);
    if (idx === -1) {
      return null;
    }
    wrapperSegments.push(output.slice(cursor, idx));
    cursor = idx + file.content.length;
  }
  wrapperSegments.push(output.slice(cursor));
  return wrapperSegments.join('');
};

/**
 * When `tokenCountTree` is enabled we already tokenize every file individually
 * via `calculateSelectiveFileMetrics`. On large repos (~1000 files, ~4 MB
 * output) tokenizing the full output again in 200 KB chunks via
 * `calculateOutputMetrics` is by far the longest parallel task in the metrics
 * pipeline (≈1 s wall, dominating the `Promise.all` below).
 *
 * Since `totalTokens` is the sum of tokens in the output, and the output is
 * built by concatenating file contents with template boilerplate, we can
 * substitute the full re-tokenization with:
 *
 *     totalTokens ≈ Σ per-file tokens + tokens(wrapper-only output)
 *
 * where the "wrapper-only output" is the output with every file's content
 * spliced out. The two values differ only at file↔wrapper boundaries where
 * BPE could otherwise merge tokens across the boundary — empirically ~0.02 %
 * on the repomix repository itself (309 tokens out of ~1.28 M).
 *
 * The fast path is only enabled for templates that embed file contents
 * verbatim (xml non-parsable, markdown, plain) and only for single-part output.
 * JSON output and parsable XML go through `fast-xml-builder` / `JSON.stringify`
 * which escape file contents, so walking the output with `indexOf(content)`
 * would miss them; those paths fall back to `calculateOutputMetrics`.
 */
const canUseFastOutputTokenPath = (config: RepomixConfigMerged): boolean => {
  if (!config.output.tokenCountTree) return false;
  if (config.output.splitOutput !== undefined) return false;
  if (config.output.parsableStyle) return false;
  const style = config.output.style;
  return style === 'xml' || style === 'markdown' || style === 'plain';
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

    // Fast path: when `tokenCountTree` is enabled we already tokenize every file
    // individually on the primary worker pool. Reuse those counts plus a single
    // cheap tokenization of the output "wrapper" (the output string minus file
    // contents) to avoid re-tokenizing the file contents a second time as part
    // of the 200 KB output chunks. On a ~4 MB output this removes ≈1 s of
    // serialized worker time, which was the dominant critical-path task in
    // `Promise.all` below. See `canUseFastOutputTokenPath` / `extractOutputWrapper`
    // for the accuracy bound (~0.02 %) and the conditions under which the fast
    // path is enabled.
    const fastOutputToken = canUseFastOutputTokenPath(config) && outputParts.length === 1 ? outputParts[0] : null;
    const fastWrapper = fastOutputToken !== null ? extractOutputWrapper(fastOutputToken, processedFiles) : null;

    const outputMetricsPromise: Promise<number[]> =
      fastWrapper !== null
        ? (async () => {
            // Reuse per-file token counts from the primary selective metrics run.
            const selective = await selectiveFileMetricsPromise;
            const fileTokensSum = selective.reduce((sum, f) => sum + f.tokenCount, 0);
            // Tokenize only the wrapper, not the ~4 MB output.
            const wrapperTokens = await runTokenCount(taskRunner, {
              content: fastWrapper,
              encoding: config.tokenCount.encoding,
            });
            logger.trace(
              `Fast-path output tokens: files=${fileTokensSum}, wrapper=${wrapperTokens} (${fastWrapper.length} chars)`,
            );
            return [fileTokensSum + wrapperTokens];
          })()
        : Promise.all(
            outputParts.map((part, index) => {
              const partPath =
                outputParts.length > 1
                  ? buildSplitOutputFilePath(config.output.filePath, index + 1)
                  : config.output.filePath;
              return deps.calculateOutputMetrics(part, config.tokenCount.encoding, partPath, { taskRunner });
            }),
          );

    const [selectiveFileMetrics, outputTokenCounts, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      selectiveFileMetricsPromise,
      outputMetricsPromise,
      gitDiffMetricsPromise,
      gitLogMetricsPromise,
    ]);

    const totalTokens = outputTokenCounts.reduce((sum, count) => sum + count, 0);
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
