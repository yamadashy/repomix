import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getWorkerThreadCount, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountItem, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Minimum batches per thread to allow Tinypool work-stealing flexibility
const MIN_BATCHES_PER_THREAD = 2;

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountTask, number[]> },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Compute dynamic batch size to ensure all worker threads stay busy.
    // With fixed BATCH_SIZE=50 and default topFilesLength (50 files), only 1 batch
    // would be created, serializing all work on a single thread.
    const { maxThreads } = getWorkerThreadCount(filesToProcess.length);
    const batchSize = Math.max(1, Math.ceil(filesToProcess.length / (maxThreads * MIN_BATCHES_PER_THREAD)));

    // Build items and split into batches
    const allItems: { item: TokenCountItem; file: ProcessedFile }[] = filesToProcess.map((file) => ({
      item: { content: file.content, path: file.path },
      file,
    }));

    const batches: { item: TokenCountItem; file: ProcessedFile }[][] = [];
    for (let i = 0; i < allItems.length; i += batchSize) {
      batches.push(allItems.slice(i, i + batchSize));
    }

    let completedItems = 0;
    const totalItems = filesToProcess.length;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await deps.taskRunner.run({
          items: batch.map((b) => b.item),
          encoding: tokenCounterEncoding,
        });

        const results: FileMetrics[] = batch.map((b, index) => ({
          path: b.file.path,
          charCount: b.file.content.length,
          tokenCount: tokenCounts[index],
        }));

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1].file;
        progressCallback(`Calculating metrics... (${completedItems}/${totalItems}) ${pc.dim(lastFile.path)}`);
        logger.trace(`Calculating metrics... (${completedItems}/${totalItems}) ${lastFile.path}`);

        return results;
      }),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return batchResults.flat();
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
