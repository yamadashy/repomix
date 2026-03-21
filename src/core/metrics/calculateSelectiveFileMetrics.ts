import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './tokenEncoding.js';
import type { TokenCountBatchTask, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Target number of files per batch task to reduce worker message overhead
const FILES_PER_BATCH = 100;

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Batch files into groups to reduce worker message overhead.
    // Instead of sending N individual tasks (one per file), send N/FILES_PER_BATCH batch tasks.
    const concurrency = getProcessConcurrency();
    const batchSize = Math.max(1, Math.min(FILES_PER_BATCH, Math.ceil(filesToProcess.length / concurrency)));
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      batches.push(filesToProcess.slice(i, i + batchSize));
    }

    logger.trace(`Batched ${filesToProcess.length} files into ${batches.length} tasks (batch size: ${batchSize})`);

    let completedTasks = 0;
    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const batchTask: TokenCountBatchTask = {
          items: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        };

        if (!deps.taskRunner.runNamed) {
          throw new Error('taskRunner.runNamed is required for batch token counting');
        }

        const tokenCounts = await deps.taskRunner.runNamed<TokenCountBatchTask, number[]>(
          batchTask,
          'countTokensBatch',
        );

        const results: FileMetrics[] = batch.map((file, index) => ({
          path: file.path,
          charCount: file.content.length,
          tokenCount: tokenCounts[index],
        }));

        completedTasks += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedTasks}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedTasks}/${filesToProcess.length})`);
        return results;
      }),
    );

    const results = batchResults.flat();

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
