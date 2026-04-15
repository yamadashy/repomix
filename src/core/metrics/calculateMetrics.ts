import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, getWorkerThreadCount, initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateFileMetrics } from './calculateFileMetrics.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';

// Re-export for backward compatibility (used by tests and external consumers)
export { extractOutputWrapper } from './extractOutputWrapper.js';

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

/**
 * Create a metrics task runner and warm up all worker threads by triggering
 * gpt-tokenizer initialization in parallel. This allows the expensive module
 * loading to overlap with other pipeline stages (security check, file processing,
 * output generation).
 */
export const createMetricsTaskRunner = async (
  numOfTasks: number,
  encoding: TokenEncoding,
): Promise<MetricsTaskRunnerWithWarmup> => {
  // Reserve one CPU core for the main thread by capping metrics workers at
  // concurrency - 1. During warmup, each worker loads gpt-tokenizer (~150ms of
  // CPU-intensive BPE rank parsing). With N workers on N cores plus the main
  // thread, the over-subscription causes heavy cache/memory-bus contention that
  // inflates warmup from ~150ms to ~380ms. Leaving one core free keeps the main
  // thread responsive for searchFiles and reduces per-worker contention, cutting
  // total warmup wall time despite having one fewer worker. The slightly lower
  // tokenization throughput is more than offset by the eliminated warmup stall.
  const maxMetricsWorkers = Math.max(1, getProcessConcurrency() - 1);
  const taskRunner = await initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
    numOfTasks,
    workerType: 'calculateMetrics',
    runtime: 'worker_threads',
    maxWorkerThreads: maxMetricsWorkers,
  });

  const { maxThreads } = getWorkerThreadCount(numOfTasks, maxMetricsWorkers);
  const warmupPromise = Promise.all(
    Array.from({ length: maxThreads }, () => taskRunner.run({ content: '', encoding }).catch(() => 0)),
  );

  return { taskRunner, warmupPromise };
};

const defaultDeps = {
  calculateFileMetrics,
  calculateOutputMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as MetricsTaskRunner | undefined,
  precomputedFileMetrics: undefined as Promise<FileMetrics[]> | undefined,
  suspiciousPathSet: undefined as Set<string> | undefined,
  precomputedOutputWrapper: undefined as Promise<string | null | undefined> | undefined,
};

export const canUseFastOutputTokenPath = (config: RepomixConfigMerged): boolean => {
  if (config.output.splitOutput !== undefined) return false;
  if (config.output.parsableStyle) return false;
  const style = config.output.style;
  return style === 'xml' || style === 'markdown' || style === 'plain';
};

// Average characters per token for the output wrapper (structural markup:
// XML/markdown tags, file-path headers, directory tree, section separators).
// Wrapper text is a mix of short English words, file paths with `/._-`
// separators, and repetitive structural tokens (e.g., `<file path="...">`,
// `## File:`). Measured on repomix's own output: ~3.7 chars/token for
// o200k_base. Using a slightly conservative 3.6 to avoid underestimating.
const CHARS_PER_TOKEN_WRAPPER: Record<string, number> = {
  o200k_base: 3.6,
  cl100k_base: 3.6,
  p50k_base: 3.3,
  p50k_edit: 3.3,
  r50k_base: 3.3,
};

const FALLBACK_WRAPPER_CHARS_PER_TOKEN = 3.3;

const estimateWrapperCharsPerToken = (encoding: string): number => {
  return CHARS_PER_TOKEN_WRAPPER[encoding] ?? FALLBACK_WRAPPER_CHARS_PER_TOKEN;
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
    (await initTaskRunner<MetricsWorkerTask, MetricsWorkerResult>({
      numOfTasks: processedFiles.length,
      workerType: 'calculateMetrics',
      runtime: 'worker_threads',
    }));

  try {
    // Use pre-computed file metrics if available (already started earlier in the
    // pipeline to overlap with security check), otherwise start fresh.
    // When pre-computed metrics are used, they may include results for files that
    // were later marked suspicious by the security check. These are filtered out
    // using suspiciousPathSet before computing totals.
    const fileMetricsPromise: Promise<FileMetrics[]> = deps.precomputedFileMetrics
      ? deps.precomputedFileMetrics.then((allMetrics) => {
          const suspicious = deps.suspiciousPathSet;
          if (suspicious && suspicious.size > 0) {
            return allMetrics.filter((m) => !suspicious.has(m.path));
          }
          return allMetrics;
        })
      : (() => {
          const metricsTargetPaths = processedFiles.map((file) => file.path);
          const p = deps.calculateFileMetrics(
            processedFiles,
            metricsTargetPaths,
            config.tokenCount.encoding,
            progressCallback,
            { taskRunner },
          );
          p.catch(() => {});
          return p;
        })();

    const gitDiffMetricsPromise = deps.calculateGitDiffMetrics(config, gitDiffResult, { taskRunner });
    const gitLogMetricsPromise = deps.calculateGitLogMetrics(config, gitLogResult, { taskRunner });

    // Prevent unhandled rejections if `await outputPromise` throws before Promise.all
    gitDiffMetricsPromise.catch(() => {});
    gitLogMetricsPromise.catch(() => {});

    // Await the output (waits for output generation to complete)
    const resolvedOutput = await outputPromise;
    const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];

    // Fast path: reuse per-file token counts and estimate wrapper tokens via
    // character ratio instead of extracting the wrapper string and sending it
    // to a worker for BPE tokenization. This eliminates:
    //   1. extractOutputWrapper() / precomputedOutputWrapper — string extraction
    //   2. IPC structured-clone of the wrapper to a worker
    //   3. Worker BPE tokenization of the wrapper
    // The wrapper consists of structural markup (XML tags, file-path headers,
    // directory tree, section separators) with a stable chars/token ratio.
    // Falls back to calculateOutputMetrics for JSON/parsable-XML/split output.
    const useFastPath = canUseFastOutputTokenPath(config) && outputParts.length === 1;

    const outputMetricsPromise: Promise<number[]> = useFastPath
      ? (async () => {
          const output = outputParts[0];
          const allFileMetrics = await fileMetricsPromise;
          const fileTokensSum = allFileMetrics.reduce((sum, f) => sum + f.tokenCount, 0);
          // Compute wrapper character count arithmetically — no extraction needed.
          // wrapperChars = output.length - sum(file.content.length) for all files
          // whose content appears verbatim in the output.
          let totalFileChars = 0;
          for (const file of processedFiles) {
            totalFileChars += file.content.length;
          }
          const wrapperChars = output.length - totalFileChars;
          if (wrapperChars < 0) {
            logger.warn(`Wrapper chars negative (${wrapperChars}), output may have been transformed — falling back to 0`);
          }
          const wrapperTokens =
            wrapperChars > 0 ? Math.ceil(wrapperChars / estimateWrapperCharsPerToken(config.tokenCount.encoding)) : 0;
          logger.trace(
            `Fast-path output tokens: files=${fileTokensSum}, wrapper=${wrapperTokens} (${wrapperChars} chars, estimated)`,
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
