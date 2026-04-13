import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount, initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateFileMetrics } from './calculateFileMetrics.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { extractOutputWrapper, type OutputStyle } from './extractOutputWrapper.js';

// Re-export for backward compatibility (used by tests and external consumers)
export { extractOutputWrapper } from './extractOutputWrapper.js';

import { type MetricsTaskRunner, runTokenCount } from './metricsWorkerRunner.js';
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
  calculateFileMetrics,
  calculateOutputMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  taskRunner: undefined as MetricsTaskRunner | undefined,
  precomputedFileMetrics: undefined as Promise<FileMetrics[]> | undefined,
  suspiciousPathSet: undefined as Set<string> | undefined,
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

    // Fast path: reuse per-file token counts plus a single cheap tokenization of
    // the output "wrapper" (output minus file contents) instead of re-tokenizing
    // the full ~4 MB output in 200 KB chunks. Falls back to calculateOutputMetrics
    // for JSON/parsable-XML/split output where indexOf can't find verbatim content.
    const singleOutput = canUseFastOutputTokenPath(config) && outputParts.length === 1 ? outputParts[0] : null;
    const style = config.output.style as 'xml' | 'markdown' | 'plain';
    const outputWrapper = singleOutput !== null ? extractOutputWrapper(singleOutput, processedFiles, style) : null;
    if (singleOutput !== null && outputWrapper === null) {
      logger.trace('Fast-path unavailable, falling back to full output tokenization');
    }

    const outputMetricsPromise: Promise<number[]> =
      outputWrapper !== null
        ? (async () => {
            // Dispatch wrapper tokenization immediately — a worker may already be
            // idle while file metrics batches still occupy the other workers.
            // Running both in parallel saves ~20ms on machines with 8+ cores.
            const wrapperTokensPromise = runTokenCount(taskRunner, {
              content: outputWrapper,
              encoding: config.tokenCount.encoding,
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
