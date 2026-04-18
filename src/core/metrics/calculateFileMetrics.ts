import pc from 'picocolors';
import { logger, repomixLogLevels } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { type MetricsTaskRunner, runBatchTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// 100 files per batch for a ~1000-file repo yields ~10 batches — still enough
// to keep 4 worker threads busy while halving the number of IPC round-trips
// (JSON serialization + pipe I/O + event-loop scheduling) compared to batch=50.
const METRICS_BATCH_SIZE = 100;

export const calculateFileMetrics = async (
  processedFiles: ProcessedFile[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: MetricsTaskRunner },
): Promise<FileMetrics[]> => {
  if (processedFiles.length === 0) {
    return [];
  }

  try {
    const isDebug = logger.getLogLevel() >= repomixLogLevels.DEBUG;
    const startTime = isDebug ? process.hrtime.bigint() : 0n;
    logger.trace(`Starting file metrics calculation for ${processedFiles.length} files using worker pool`);

    // Split files into batches to reduce IPC round-trips
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < processedFiles.length; i += METRICS_BATCH_SIZE) {
      batches.push(processedFiles.slice(i, i + METRICS_BATCH_SIZE));
    }

    logger.trace(`Split ${processedFiles.length} files into ${batches.length} batches for token counting`);

    let completedItems = 0;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await runBatchTokenCount(deps.taskRunner, {
          items: batch.map((file) => ({ content: file.content })),
          encoding: tokenCounterEncoding,
        });

        const results: FileMetrics[] = batch.map((file, index) => ({
          path: file.path,
          tokenCount: tokenCounts[index],
        }));

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedItems}/${processedFiles.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedItems}/${processedFiles.length}) ${lastFile.path}`);

        return results;
      }),
    );

    const allResults = batchResults.flat();

    if (isDebug) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms`);
    }

    return allResults;
  } catch (error) {
    logger.error('Error during file metrics calculation:', error);
    throw error;
  }
};
