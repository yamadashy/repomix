import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { METRICS_POOL_SIZING_ESTIMATE } from './metricsPoolConfig.js';
import { type MetricsTaskRunner, runBatchTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

// Floor on batch size so IPC overhead stays amortised across multiple files
// per round-trip, even on small repos.
const MIN_METRICS_BATCH_SIZE = 50;

// Target batches per worker. Trades off IPC overhead (fewer, bigger batches)
// against load balance when file sizes vary (more, smaller batches). Empirically
// ~8 keeps structured-clone + futex wake-ups under 10% of the file-metrics
// stage while letting idle workers pick up single-shot tasks (git diff / git
// log tokenization) scheduled on the same pool.
const TARGET_BATCHES_PER_WORKER = 8;

export const calculateFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: MetricsTaskRunner },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file metrics calculation for ${filesToProcess.length} files using worker pool`);

    const { maxThreads } = getWorkerThreadCount(METRICS_POOL_SIZING_ESTIMATE);
    const batchSize = Math.max(
      MIN_METRICS_BATCH_SIZE,
      Math.ceil(filesToProcess.length / (maxThreads * TARGET_BATCHES_PER_WORKER)),
    );

    // Largest-first so workers start on the slow batches immediately (Tinypool
    // dispatches batches FIFO). Safe to reorder: the consumer builds its
    // fileTokenCounts map by path lookup, so dispatch order is not observable.
    filesToProcess.sort((a, b) => b.content.length - a.content.length);

    // Split files into batches to reduce IPC round-trips
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      batches.push(filesToProcess.slice(i, i + batchSize));
    }

    logger.trace(`Split ${filesToProcess.length} files into ${batches.length} batches for token counting`);

    let completedItems = 0;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await runBatchTokenCount(deps.taskRunner, {
          items: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        });

        const results: FileMetrics[] = batch.map((file, index) => ({
          path: file.path,
          charCount: file.content.length,
          tokenCount: tokenCounts[index],
        }));

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedItems}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedItems}/${filesToProcess.length}) ${lastFile.path}`);

        return results;
      }),
    );

    const allResults = batchResults.flat();

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during file metrics calculation:', error);
    throw error;
  }
};
