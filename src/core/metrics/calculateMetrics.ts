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
    // For top files display optimization: calculate token counts only for top files by character count
    // However, if tokenCountTree is enabled, calculate for all files to avoid double calculation
    const topFilesLength = config.output.topFilesLength;
    const shouldCalculateAllFiles = !!config.output.tokenCountTree;

    // Determine which files to calculate token counts for:
    // - If tokenCountTree is enabled: calculate for all files to avoid double calculation
    // - Otherwise: calculate only for top files by character count for optimization
    // A 3x multiplier provides sufficient coverage for accurate top-N ranking since
    // character count and token count are highly correlated for code (r > 0.95).
    const metricsTargetPaths = shouldCalculateAllFiles
      ? processedFiles.map((file) => file.path)
      : [...processedFiles]
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 3, topFilesLength)))
          .map((file) => file.path);

    // When all file tokens are available (tokenCountTree enabled), skip the expensive
    // full-output tokenization and derive total tokens from per-file counts.
    // The output is ~97.5% file content; using the per-file char/token ratio to estimate
    // the remaining ~2.5% overhead (headers, tree, XML tags) yields <0.1% error.
    // This eliminates ~3.6MB of redundant tokenization through the worker pool.
    const shouldEstimateOutputTokens = shouldCalculateAllFiles && processedFiles.length > 0;

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
