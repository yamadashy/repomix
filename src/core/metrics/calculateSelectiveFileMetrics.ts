import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountItem, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// A moderate batch size (50) reduces IPC round-trips by ~98%
// while keeping enough batches to utilize all available CPU cores.
const BATCH_SIZE = 50;

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

    // Build items and split into batches
    const allItems: { item: TokenCountItem; file: ProcessedFile }[] = filesToProcess.map((file) => ({
      item: { content: file.content, path: file.path },
      file,
    }));

    const batches: { item: TokenCountItem; file: ProcessedFile }[][] = [];
    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      batches.push(allItems.slice(i, i + BATCH_SIZE));
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
