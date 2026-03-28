import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import type { TokenCountWorkerResult, TokenCountWorkerTask } from './workers/calculateMetricsWorker.js';

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

export type MetricsTaskRunner = TaskRunner<TokenCountWorkerTask, TokenCountWorkerResult>;

/**
 * Create a metrics task runner that can be pre-initialized to overlap
 * tiktoken WASM loading with other pipeline stages.
 */
export const createMetricsTaskRunner = (numOfTasks: number): MetricsTaskRunner => {
  return initTaskRunner<TokenCountWorkerTask, TokenCountWorkerResult>({
    numOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
  });
};

/**
 * Conservative lower bound for chars-per-token ratio. Real code is typically 3.5-4.5,
 * but CJK-heavy or binary-like content can go as low as ~2.0. Using 2.0 ensures we
 * never miss a file that could exceed the token threshold.
 */
const MIN_CHARS_PER_TOKEN = 2.0;

/**
 * Target number of evenly-spaced sample files used to estimate the char/token ratio
 * when not tokenizing all files. 50 files across the size distribution gives ~3% error,
 * which is acceptable for an informational total token count metric.
 */
const ESTIMATION_SAMPLE_TARGET = 100;

/**
 * Select which files to tokenize based on the tokenCountTree configuration.
 *
 * Three modes:
 * 1. tokenCountTree = false → only top files for display (fast, output tokenized separately)
 * 2. tokenCountTree = true → all files (accurate tree, output estimated from ratio)
 * 3. tokenCountTree = N (number) → pre-filter by char count + representative sample
 *    Files whose char count is below N * MIN_CHARS_PER_TOKEN cannot exceed N tokens,
 *    so they're skipped. A stratified sample provides an accurate ratio for output estimation.
 */
const selectMetricsTargets = (
  processedFiles: ProcessedFile[],
  topFilesLength: number,
  tokenCountTree: boolean | number | string | undefined,
): { metricsTargetPaths: string[]; shouldEstimateOutputTokens: boolean } => {
  const tokenCountTreeEnabled = !!tokenCountTree;
  const tokenTreeThreshold =
    typeof tokenCountTree === 'number'
      ? tokenCountTree
      : typeof tokenCountTree === 'string'
        ? Number(tokenCountTree) || 0
        : 0;

  if (tokenCountTreeEnabled && tokenTreeThreshold > 0) {
    // Numeric threshold: only tokenize files that could exceed it, plus a sample for estimation
    const charThreshold = tokenTreeThreshold * MIN_CHARS_PER_TOKEN;

    // Files that could exceed the token threshold based on character count
    const treeCandidatePaths: string[] = [];
    for (const file of processedFiles) {
      if (file.content.length >= charThreshold) {
        treeCandidatePaths.push(file.path);
      }
    }

    // Top files by char count for the top-N display
    const sortedBySize = [...processedFiles].sort((a, b) => b.content.length - a.content.length);
    const topCount = Math.min(processedFiles.length, Math.max(topFilesLength * 3, topFilesLength));
    const topPaths = sortedBySize.slice(0, topCount).map((f) => f.path);

    // Evenly-spaced sample from the size-sorted list for accurate ratio estimation.
    // This covers the full file-size distribution, avoiding the bias of top-N-only sampling.
    const sampleInterval = Math.max(1, Math.floor(processedFiles.length / ESTIMATION_SAMPLE_TARGET));
    const samplePaths: string[] = [];
    for (let i = 0; i < sortedBySize.length; i += sampleInterval) {
      samplePaths.push(sortedBySize[i].path);
    }

    // Union all sets
    const pathSet = new Set([...treeCandidatePaths, ...topPaths, ...samplePaths]);

    return {
      metricsTargetPaths: [...pathSet],
      shouldEstimateOutputTokens: pathSet.size > 0,
    };
  }

  if (tokenCountTreeEnabled) {
    // Boolean true (or string truthy): tokenize all files for accurate tree display.
    // Output tokens are estimated from the per-file char/token ratio (<0.1% error).
    return {
      metricsTargetPaths: processedFiles.map((file) => file.path),
      shouldEstimateOutputTokens: processedFiles.length > 0,
    };
  }

  // No tokenCountTree: only tokenize top files for the top-N display.
  // A 3x multiplier provides sufficient coverage for accurate top-N ranking since
  // character count and token count are highly correlated for code (r > 0.95).
  return {
    metricsTargetPaths: [...processedFiles]
      .sort((a, b) => b.content.length - a.content.length)
      .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 3, topFilesLength)))
      .map((file) => file.path),
    shouldEstimateOutputTokens: false,
  };
};

const defaultDeps = {
  calculateSelectiveFileMetrics,
  calculateOutputMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as MetricsTaskRunner | undefined,
};

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  output: string | string[],
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
    initTaskRunner<TokenCountWorkerTask, TokenCountWorkerResult>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });

  try {
    const outputParts = Array.isArray(output) ? output : [output];
    const topFilesLength = config.output.topFilesLength;

    // Determine which files to calculate token counts for, balancing accuracy vs speed.
    // Three modes depending on tokenCountTree configuration:
    const { metricsTargetPaths, shouldEstimateOutputTokens } = selectMetricsTargets(
      processedFiles,
      topFilesLength,
      config.output.tokenCountTree,
    );

    const [selectiveFileMetrics, outputTokenCounts, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      deps.calculateSelectiveFileMetrics(
        processedFiles,
        metricsTargetPaths,
        config.tokenCount.encoding,
        progressCallback,
        { taskRunner },
      ),
      shouldEstimateOutputTokens
        ? Promise.resolve([0])
        : Promise.all(
            outputParts.map(async (part, index) => {
              const partPath =
                outputParts.length > 1
                  ? buildSplitOutputFilePath(config.output.filePath, index + 1)
                  : config.output.filePath;
              return await deps.calculateOutputMetrics(part, config.tokenCount.encoding, partPath, { taskRunner });
            }),
          ),
      deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner }),
      deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner }),
    ]);

    let totalTokens: number;
    if (shouldEstimateOutputTokens) {
      // Derive total output tokens from per-file token counts using the char/token ratio.
      // Since the output is overwhelmingly file content (~97.5%), the ratio from file metrics
      // accurately estimates the small overhead (template wrappers, headers, tree structure).
      const fileTokensTotal = selectiveFileMetrics.reduce((sum, f) => sum + f.tokenCount, 0);
      const fileCharsTotal = selectiveFileMetrics.reduce((sum, f) => sum + f.charCount, 0);
      const outputCharsTotal = outputParts.reduce((sum, p) => sum + p.length, 0);

      if (fileCharsTotal > 0 && fileTokensTotal > 0) {
        totalTokens = Math.round(outputCharsTotal * (fileTokensTotal / fileCharsTotal));
      } else {
        totalTokens = 0;
      }
    } else {
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
