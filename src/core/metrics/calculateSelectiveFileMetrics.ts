import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchTask, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountTask | TokenCountBatchTask, number | number[]> },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Batch files into groups to reduce worker dispatch overhead.
    // Use concurrency * 2 batches for good load balancing across workers.
    const batchCount = Math.max(1, getProcessConcurrency() * 2);
    const batchSize = Math.ceil(filesToProcess.length / batchCount);
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      batches.push(filesToProcess.slice(i, i + batchSize));
    }

    let completedFiles = 0;
    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = (await deps.taskRunner.run({
          contents: batch.map((file) => file.content),
          encoding: tokenCounterEncoding,
          paths: batch.map((file) => file.path),
        })) as number[];

        const results: FileMetrics[] = batch.map((file, i) => ({
          path: file.path,
          charCount: file.content.length,
          tokenCount: tokenCounts[i],
        }));

        completedFiles += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedFiles}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedFiles}/${filesToProcess.length}) ${lastFile.path}`);
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
