import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// A moderate batch size (50) reduces IPC round-trips by ~95% (e.g. 990 → 20)
// while keeping enough batches to utilize all available CPU cores.
const BATCH_SIZE = 50;

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountBatchTask, number[]> },
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
    for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
      batches.push(filesToProcess.slice(i, i + BATCH_SIZE));
    }

    let completedTasks = 0;
    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await deps.taskRunner.run({
          items: batch.map((file) => ({
            content: file.content,
            encoding: tokenCounterEncoding,
            path: file.path,
          })),
        });

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
        logger.trace(`Calculating metrics... (${completedTasks}/${filesToProcess.length}) ${lastFile.path}`);

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
