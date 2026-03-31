import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
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
import type { TokenEncoding } from './TokenCounter.js';
import { TokenCounter } from './TokenCounter.js';
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
 * Create a worker-thread metrics task runner. Retained for external callers
 * (e.g. MCP server mode) that need a persistent pool. For CLI usage,
 * prefer createMainThreadMetricsRunner which avoids worker overhead.
 */
export const createMetricsTaskRunner = (numOfTasks: number): MetricsTaskRunner => {
  return initTaskRunner<TokenCountWorkerTask, TokenCountWorkerResult>({
    numOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
    // Idle timeout to keep the warm worker alive through the pipeline (~300ms)
    // between warmup and metrics calculation. Default 100ms is too short.
    // 2000ms provides ample margin even on slow CI runners where the pipeline
    // may take 800-1200ms before metrics tasks arrive.
    // Process exit is not delayed because unref() is called after pack() completes.
    idleTimeout: 2000,
  });
};

/**
 * Create a main-thread metrics task runner that avoids worker thread overhead.
 *
 * With gpt-tokenizer (pure JS, ~145ms load), the worker thread overhead (spawn ~50ms +
 * IPC ~20ms per batch + CPU contention on 2-vCPU runners) exceeds the benefit for the
 * ~20 file + 2 git tasks that remain after output token estimation. This runner starts
 * loading gpt-tokenizer immediately via a background dynamic import, which makes progress
 * during the pipeline's async stages (git subprocess waits, security worker waits). By
 * metrics time, the module is typically already loaded.
 *
 * Compared to the worker approach, this eliminates:
 * - Worker thread spawn overhead (~50ms on CI)
 * - IPC serialization per task batch (~20-30ms on critical path)
 * - CPU contention from an extra thread during search+collect+process stages
 * - Worker idle memory during the pipeline
 */
export const createMainThreadMetricsRunner = (encoding: TokenEncoding): MetricsTaskRunner => {
  // Start loading gpt-tokenizer immediately. The dynamic import progresses during
  // the pipeline's async I/O waits (git subprocesses, security workers, file reads).
  const counterPromise = initMainThreadCounter(encoding);

  return {
    run: async (task: TokenCountWorkerTask): Promise<TokenCountWorkerResult> => {
      const tc = await counterPromise;
      if ('batch' in task) {
        return task.batch.map((item) => tc.countTokens(item.content, item.path));
      }
      return tc.countTokens(task.content, task.path);
    },
    cleanup: async () => {
      // TokenCounter cached in module-level Map; no-op for gpt-tokenizer (pure JS)
    },
    // No-op: main-thread runner has no worker threads to unref
    unref: () => {},
  };
};

const initMainThreadCounter = async (encoding: TokenEncoding): Promise<TokenCounter> => {
  const startTime = performance.now();
  const counter = new TokenCounter(encoding);
  await counter.init();
  const duration = performance.now() - startTime;
  logger.debug(`Main-thread gpt-tokenizer initialization took ${duration.toFixed(2)}ms`);
  return counter;
};

/**
 * Conservative lower bound for chars-per-token ratio. Real code is typically 3.5-4.5,
 * but CJK-heavy or binary-like content can go as low as ~2.0. Using 2.0 ensures we
 * never miss a file that could exceed the token threshold.
 */
const MIN_CHARS_PER_TOKEN = 2.0;

/**
 * Select which files to tokenize based on the tokenCountTree configuration.
 *
 * Three modes:
 * 1. tokenCountTree = false → only top files for display (fast, output tokenized separately)
 * 2. tokenCountTree = true → all files (accurate tree, output estimated from ratio)
 * 3. tokenCountTree = N (number) → pre-filter by char count, estimate output from tokenized files.
 *    Only files whose char count could exceed N tokens (via MIN_CHARS_PER_TOKEN) are tokenized,
 *    plus the top files for display. Output tokens are estimated from these files' char/token ratio
 *    without a separate sample pass, since large files dominate total content and provide an
 *    accurate ratio (~3-5% error, acceptable for informational display).
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
    // Numeric threshold: only tokenize files that could exceed it, plus top files for display.
    // No separate sample pass needed — the union of tree candidates + top files provides
    // a sufficient char/token ratio for output estimation, since these files collectively
    // represent a large share of total content.
    const charThreshold = tokenTreeThreshold * MIN_CHARS_PER_TOKEN;

    // Files that could exceed the token threshold based on character count
    const treeCandidatePaths: string[] = [];
    for (const file of processedFiles) {
      if (file.content.length >= charThreshold) {
        treeCandidatePaths.push(file.path);
      }
    }

    // Top files by char count for the top-N display
    const topCount = Math.min(processedFiles.length, Math.max(topFilesLength * 3, topFilesLength));
    const topPaths = selectTopPathsByCharCount(processedFiles, topCount);

    // Union tree candidates + top files (no sample needed)
    const pathSet = new Set([...treeCandidatePaths, ...topPaths]);

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
  // Output tokens are estimated from the per-file char/token ratio rather than
  // tokenizing the full output (~3.7MB), avoiding the cost of loading gpt-tokenizer
  // and processing the entire output string. The estimation error is <5%
  // (acceptable for an informational display metric) and the technique is proven
  // by the tokenCountTree code path.
  const topCount = Math.min(processedFiles.length, Math.max(topFilesLength * 3, topFilesLength));
  return {
    metricsTargetPaths: selectTopPathsByCharCount(processedFiles, topCount),
    shouldEstimateOutputTokens: true,
  };
};

/**
 * Select the top N file paths by character count using a partial sort (selection algorithm).
 * For small topCount relative to total files, this is O(N) average vs O(N log N) for full sort.
 */
const selectTopPathsByCharCount = (processedFiles: ProcessedFile[], topCount: number): string[] => {
  if (topCount >= processedFiles.length) {
    return processedFiles.map((f) => f.path);
  }

  // Use nth_element-style partial sort: partition around the kth largest element
  const indexed = processedFiles.map((f, i) => ({ charCount: f.content.length, index: i }));
  partialSortDesc(indexed, topCount);
  return indexed.slice(0, topCount).map((item) => processedFiles[item.index].path);
};

/**
 * In-place partial sort: moves the top k largest elements to the front (descending).
 * Average O(N) via quickselect, vs O(N log N) for full sort.
 */
const partialSortDesc = (arr: { charCount: number; index: number }[], k: number): void => {
  if (k >= arr.length) return;

  const quickselect = (lo: number, hi: number, targetIdx: number): void => {
    while (lo < hi) {
      const pivotVal = arr[lo + ((hi - lo) >> 1)].charCount;
      let i = lo;
      let j = hi;
      while (i <= j) {
        while (arr[i].charCount > pivotVal) i++;
        while (arr[j].charCount < pivotVal) j--;
        if (i <= j) {
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
          i++;
          j--;
        }
      }
      if (targetIdx <= j) {
        hi = j;
      } else if (targetIdx >= i) {
        lo = i;
      } else {
        return;
      }
    }
  };

  quickselect(0, arr.length - 1, k - 1);
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
