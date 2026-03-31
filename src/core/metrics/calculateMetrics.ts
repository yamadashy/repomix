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
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

/**
 * Create a metrics task runner that can be pre-initialized to overlap
 * tiktoken WASM loading with other pipeline stages.
 */
export const createMetricsTaskRunner = (numOfTasks: number): TaskRunner<TokenCountTask, number> => {
  return initTaskRunner<TokenCountTask, number>({
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
  taskRunner: undefined as TaskRunner<TokenCountTask, number> | undefined,
};

/**
 * Estimate total output tokens from per-file token counts when all files have been individually counted.
 *
 * When tokenCountTree is enabled, every file's tokens are already counted individually.
 * The output is ~93% file content, so we can avoid re-tokenizing the entire output (~3.8MB)
 * by summing per-file counts and estimating the template overhead (~7%) using the
 * chars-to-tokens ratio derived from the actual file tokenization data.
 */
const estimateOutputTokens = (
  processedFiles: ProcessedFile[],
  fileTokenCounts: Record<string, number>,
  totalOutputChars: number,
  gitDiffTokenCount: number,
  gitLogTokenCount: number,
  gitDiffChars: number,
  gitLogChars: number,
): number => {
  let totalFileTokens = 0;
  let totalFileChars = 0;
  for (const file of processedFiles) {
    const tokens = fileTokenCounts[file.path];
    if (tokens !== undefined) {
      totalFileTokens += tokens;
      totalFileChars += file.content.length;
    }
  }

  // Overhead = output chars minus file content and git content
  const overheadChars = totalOutputChars - totalFileChars - gitDiffChars - gitLogChars;

  // Estimate overhead tokens using the chars-per-token ratio from file data.
  // Typical ratio: ~3.5-4.5 chars/token for mixed code+text.
  // Fallback to 4.0 if no file data is available or ratio is degenerate.
  const rawRatio = totalFileTokens > 0 ? totalFileChars / totalFileTokens : 0;
  const charsPerToken = rawRatio > 0 ? rawRatio : 4.0;
  const overheadTokens = overheadChars > 0 ? Math.round(overheadChars / charsPerToken) : 0;

  return totalFileTokens + gitDiffTokenCount + gitLogTokenCount + overheadTokens;
};

/**
 * Get the total character count of git diff content.
 */
const getGitDiffChars = (gitDiffResult: GitDiffResult | undefined): number => {
  if (!gitDiffResult) return 0;
  return (gitDiffResult.workTreeDiffContent?.length ?? 0) + (gitDiffResult.stagedDiffContent?.length ?? 0);
};

/**
 * Get the total character count of git log content.
 */
const getGitLogChars = (gitLogResult: GitLogResult | undefined): number => {
  if (!gitLogResult) return 0;
  return gitLogResult.logContent?.length ?? 0;
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
    initTaskRunner<TokenCountTask, number>({
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
    const metricsTargetPaths = shouldCalculateAllFiles
      ? processedFiles.map((file) => file.path)
      : [...processedFiles]
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
          .map((file) => file.path);

    // When all files are individually counted (tokenCountTree enabled), skip the expensive
    // output token counting (~3.8MB re-tokenization) and estimate total output tokens from
    // per-file counts + overhead estimation. This eliminates ~50% of tokenization work.
    if (shouldCalculateAllFiles) {
      const [selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
        deps.calculateSelectiveFileMetrics(
          processedFiles,
          metricsTargetPaths,
          config.tokenCount.encoding,
          progressCallback,
          { taskRunner },
        ),
        deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner }),
        deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner }),
      ]);

      const totalFiles = processedFiles.length;
      const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

      // Build file metrics maps
      const fileCharCounts: Record<string, number> = {};
      const fileTokenCounts: Record<string, number> = {};
      for (const file of processedFiles) {
        fileCharCounts[file.path] = file.content.length;
      }
      for (const file of selectiveFileMetrics) {
        fileTokenCounts[file.path] = file.tokenCount;
      }

      const totalTokens = estimateOutputTokens(
        processedFiles,
        fileTokenCounts,
        totalCharacters,
        gitDiffTokenCount,
        gitLogTokenCount.gitLogTokenCount,
        getGitDiffChars(gitDiffResult),
        getGitLogChars(gitLogResult),
      );

      return {
        totalFiles,
        totalCharacters,
        totalTokens,
        fileCharCounts,
        fileTokenCounts,
        gitDiffTokenCount: gitDiffTokenCount,
        gitLogTokenCount: gitLogTokenCount.gitLogTokenCount,
      };
    }

    const [selectiveFileMetrics, outputTokenCounts, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      deps.calculateSelectiveFileMetrics(
        processedFiles,
        metricsTargetPaths,
        config.tokenCount.encoding,
        progressCallback,
        { taskRunner },
      ),
      Promise.all(
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
