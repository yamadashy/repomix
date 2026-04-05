import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { MetricsWorkerResult, MetricsWorkerTask, TokenCountBatchTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs (~0.5ms each) that dominate when processing many files.
// For 991 files: 991 round-trips → 20 batches, saving ~485ms of IPC overhead.
const METRICS_BATCH_SIZE = 50;

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<MetricsWorkerTask, MetricsWorkerResult> },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Split files into batches to reduce IPC round-trips
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < filesToProcess.length; i += METRICS_BATCH_SIZE) {
      batches.push(filesToProcess.slice(i, i + METRICS_BATCH_SIZE));
    }

    logger.trace(`Split ${filesToProcess.length} files into ${batches.length} batches for token counting`);

    let completedItems = 0;
    const allResults: FileMetrics[] = [];

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const batchTask: TokenCountBatchTask = {
          items: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        };

        const tokenCounts = (await deps.taskRunner.run(batchTask)) as number[];

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

    allResults.push(...batchResults.flat());

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
