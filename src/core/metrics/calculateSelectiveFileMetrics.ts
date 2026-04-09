import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { type MetricsTaskRunner, runBatchTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

// Batch sizes for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs (~0.5-1ms each) that dominate when processing many files.
//
// When processing many files (tokenCountTree enabled), larger batches significantly
// reduce the total number of IPC round-trips (e.g., 1000 files: 10 batches of 100 vs
// 100 batches of 10), saving ~30ms of scheduling overhead on a typical 4-core machine.
// Batch size 100 is optimal: large enough to minimize IPC round-trips, small enough
// to maintain good load balancing across workers (avoiding the imbalance seen with
// batch sizes ≥250 where a single oversized batch can stall one worker).
//
// When processing few files (tokenCountTree disabled, only top files), smaller batches
// ensure work is distributed across available workers rather than monopolizing one.
const METRICS_BATCH_SIZE_SMALL = 10;
const METRICS_BATCH_SIZE_LARGE = 100;
const LARGE_BATCH_THRESHOLD = 100;

export const calculateSelectiveFileMetrics = async (
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
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Split files into batches to reduce IPC round-trips.
    // Use larger batches when processing many files to minimize scheduling overhead.
    const batchSize =
      filesToProcess.length > LARGE_BATCH_THRESHOLD ? METRICS_BATCH_SIZE_LARGE : METRICS_BATCH_SIZE_SMALL;
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
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
