import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
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
 * gpt-tokenizer loading with other pipeline stages.
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
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as TaskRunner<TokenCountTask, number> | undefined,
};

/**
 * Estimate total output tokens from per-file token counts and a chars-to-tokens ratio.
 *
 * The output is ~93% file content. For files that have been individually tokenized,
 * their exact counts are used. For uncounted files and template overhead, the
 * chars-to-tokens ratio derived from the counted files is applied.
 * This avoids re-tokenizing the entire output (~4MB), which would otherwise
 * require waiting for output generation to complete before tokenization can start.
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
  let countedFileTokens = 0;
  let countedFileChars = 0;
  let uncountedFileChars = 0;

  for (const file of processedFiles) {
    const tokens = fileTokenCounts[file.path];
    if (tokens !== undefined) {
      countedFileTokens += tokens;
      countedFileChars += file.content.length;
    } else {
      uncountedFileChars += file.content.length;
    }
  }

  // Derive chars-per-token ratio from the counted files.
  // Typical ratio: ~3.5-4.5 chars/token for mixed code+text.
  // Fallback to 4.0 if no counted file data is available.
  const rawRatio = countedFileTokens > 0 ? countedFileChars / countedFileTokens : 0;
  const charsPerToken = rawRatio > 0 ? rawRatio : 4.0;

  // Estimate tokens for uncounted files using the derived ratio
  const uncountedFileTokens = uncountedFileChars > 0 ? Math.round(uncountedFileChars / charsPerToken) : 0;

  // Overhead = output chars minus all file content and git content
  const totalFileChars = countedFileChars + uncountedFileChars;
  const overheadChars = totalOutputChars - totalFileChars - gitDiffChars - gitLogChars;
  const overheadTokens = overheadChars > 0 ? Math.round(overheadChars / charsPerToken) : 0;

  return countedFileTokens + uncountedFileTokens + gitDiffTokenCount + gitLogTokenCount + overheadTokens;
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
    initTaskRunner<TokenCountTask, number>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    });

  try {
    // Determine which files to calculate token counts for:
    // - If tokenCountTree is enabled: calculate for all files (needed for display)
    // - Otherwise: calculate only for top files by character count
    const topFilesLength = config.output.topFilesLength;
    const shouldCalculateAllFiles = !!config.output.tokenCountTree;

    const metricsTargetPaths = shouldCalculateAllFiles
      ? processedFiles.map((file) => file.path)
      : [...processedFiles]
          .sort((a, b) => b.content.length - a.content.length)
          .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
          .map((file) => file.path);

    // Start all metrics immediately so they overlap with output generation.
    // Total output tokens are always estimated from per-file counts + chars-to-tokens ratio
    // rather than tokenizing the full output (~4MB). This eliminates the sequential dependency
    // where output must complete before tokenization could begin, saving ~200-250ms.
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

    // Wait for output and all metrics in parallel
    const [resolvedOutput, selectiveFileMetrics, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      outputPromise,
      selectiveFileMetricsPromise,
      gitDiffMetricsPromise,
      gitLogMetricsPromise,
    ]);

    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];
    const totalFiles = processedFiles.length;
    const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

    // Build character counts for all files
    const fileCharCounts: Record<string, number> = {};
    for (const file of processedFiles) {
      fileCharCounts[file.path] = file.content.length;
    }

    // Build token counts for counted files
    const fileTokenCounts: Record<string, number> = {};
    for (const file of selectiveFileMetrics) {
      fileTokenCounts[file.path] = file.tokenCount;
    }

    // Estimate total output tokens from per-file counts + chars-to-tokens ratio.
    // For counted files, exact token counts are used; for uncounted files and
    // template overhead, the ratio from counted files is applied.
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
  } finally {
    // Cleanup the task runner after all calculations are complete (only if we created it)
    if (!deps.taskRunner) {
      await taskRunner.cleanup();
    }
  }
};
