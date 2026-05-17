import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateFileMetrics } from './calculateFileMetrics.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { type MetricsTaskRunner, runTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import { contentCacheKey, getCached, setCached } from './tokenCountCache.js';
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

// Cap on metrics workers spawned for both warm-up and real tokenization.
// The metrics phase fits comfortably in 3 workers for the typical Repomix
// workload (≤1000 files); each extra worker pays a fresh ~200-285ms
// gpt-tokenizer BPE table parse that contends with the file-collection
// main thread for very small marginal benefit.
const METRICS_PREWARM_THREAD_CAP = 3;

/**
 * Create the metrics worker pool and warm up its threads by triggering
 * gpt-tokenizer initialization in parallel. Called BEFORE `searchFiles` so
 * the ~200-285ms-per-worker BPE table parse overlaps the entire search +
 * collect + security + process pipeline rather than only the post-search
 * stages.
 *
 * Because the pool is created without knowing the file count, it is sized
 * by `min(host concurrency, METRICS_PREWARM_THREAD_CAP)` instead of the
 * `ceil(numOfTasks / 100)` heuristic. On the worst case (>1000 files on a
 * >3-vCPU host) this caps the metrics pool at 3 workers — acceptable because
 * the metrics phase overlaps `produceOutput` and is no longer on the
 * critical path after the per-file token-count cache landed.
 */
export const createMetricsTaskRunner = (encoding: TokenEncoding): MetricsTaskRunnerWithWarmup => {
  const maxThreads = Math.max(1, Math.min(getProcessConcurrency(), METRICS_PREWARM_THREAD_CAP));

  const taskRunner = initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
    // numOfTasks is no longer meaningful at create time; maxWorkerThreads is
    // the sole cap. Pass a sentinel large enough that the per-task heuristic
    // in `getWorkerThreadCount` cannot drop us below the cap.
    numOfTasks: maxThreads * 100,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
    maxWorkerThreads: maxThreads,
  });

  try {
    const warmupPromise = Promise.all(
      Array.from({ length: maxThreads }, () => taskRunner.run({ content: '', encoding }).catch(() => 0)),
    );

    return { taskRunner, warmupPromise };
  } catch (error) {
    // The Tinypool was already created above. If anything between pool
    // creation and the return throws synchronously (e.g. a `run()` call
    // dispatches an immediate error in a future Tinypool release), tear
    // the pool down before rethrowing so the caller never receives a half-
    // constructed runner and we don't leak worker_threads.
    void taskRunner.cleanup();
    throw error;
  }
};

const defaultDeps = {
  calculateFileMetrics,
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
export const extractOutputWrapper = (
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

export const canUseFastOutputTokenPath = (config: RepomixConfigMerged): boolean => {
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
    const metricsTargetPaths = processedFiles.map((file) => file.path);

    // Start output-independent metrics immediately so they can overlap with output generation
    // when output is passed as a promise
    const fileMetricsPromise = deps.calculateFileMetrics(
      processedFiles,
      metricsTargetPaths,
      config.tokenCount.encoding,
      progressCallback,
      { taskRunner },
    );
    const gitDiffMetricsPromise = deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner });
    const gitLogMetricsPromise = deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner });

    // Prevent unhandled rejections if `await outputPromise` throws before Promise.all
    fileMetricsPromise.catch(() => {});
    gitDiffMetricsPromise.catch(() => {});
    gitLogMetricsPromise.catch(() => {});

    // Await the output (waits for output generation to complete)
    const resolvedOutput = await outputPromise;
    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];

    // Fast path: reuse per-file token counts plus a single cheap tokenization of
    // the output "wrapper" (output minus file contents) instead of re-tokenizing
    // the full ~4 MB output in 200 KB chunks. Falls back to calculateOutputMetrics
    // for JSON/parsable-XML/split output where indexOf can't find verbatim content.
    const singleOutput = canUseFastOutputTokenPath(config) && outputParts.length === 1 ? outputParts[0] : null;
    const outputWrapper = singleOutput !== null ? extractOutputWrapper(singleOutput, processedFiles) : null;
    if (singleOutput !== null && outputWrapper === null) {
      logger.trace('Fast-path unavailable, falling back to full output tokenization');
    }

    const outputMetricsPromise: Promise<number[]> =
      outputWrapper !== null
        ? (async () => {
            // Dispatch wrapper tokenization immediately — a worker may already be
            // idle while file metrics batches still occupy the other workers.
            // The wrapper string is byte-stable across runs whenever the file
            // set, headers, instructions, and template format are unchanged, so
            // we reuse the same content-addressed disk cache as per-file token
            // counts. Any change to the wrapper automatically misses.
            const wrapperCacheKey = contentCacheKey(config.tokenCount.encoding, outputWrapper);
            const cachedWrapperTokens = getCached(wrapperCacheKey);
            const wrapperTokensPromise =
              cachedWrapperTokens !== undefined
                ? Promise.resolve(cachedWrapperTokens)
                : runTokenCount(taskRunner, {
                    content: outputWrapper,
                    encoding: config.tokenCount.encoding,
                  }).then((tokens) => {
                    setCached(wrapperCacheKey, tokens);
                    return tokens;
                  });
            const [allFileMetrics, wrapperTokens] = await Promise.all([fileMetricsPromise, wrapperTokensPromise]);
            const fileTokensSum = allFileMetrics.reduce((sum, f) => sum + f.tokenCount, 0);
            logger.trace(
              `Fast-path output tokens: files=${fileTokensSum}, wrapper=${wrapperTokens} (${outputWrapper.length} chars)`,
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

    const [fileMetrics, outputTokenCounts, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
      fileMetricsPromise,
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

    // Build per-file token counts
    const fileTokenCounts: Record<string, number> = {};
    for (const file of fileMetrics) {
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
