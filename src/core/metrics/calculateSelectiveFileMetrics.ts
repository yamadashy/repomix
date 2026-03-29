import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type {
  TokenCountBatchTask,
  TokenCountWorkerResult,
  TokenCountWorkerTask,
} from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountWorkerTask, TokenCountWorkerResult> },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Batch files into groups matching CPU cores to minimize IPC round-trips.
    // Previously sent one task per file (e.g. 50 tasks), each incurring ~3ms IPC overhead.
    // Batching into ~4 groups reduces IPC overhead from ~150ms to ~12ms.
    const numBatches = Math.max(1, Math.min(filesToProcess.length, getProcessConcurrency()));
    const batchSize = Math.ceil(filesToProcess.length / numBatches);
    const batches: ProcessedFile[][] = [];

    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      batches.push(filesToProcess.slice(i, i + batchSize));
    }

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const batchTask: TokenCountBatchTask = {
          batch: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        };
        return (await deps.taskRunner.run(batchTask)) as number[];
      }),
    );

    // Flatten batch results into FileMetrics
    const results: FileMetrics[] = [];
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const tokenCounts = batchResults[batchIdx];
      for (let fileIdx = 0; fileIdx < batch.length; fileIdx++) {
        const file = batch[fileIdx];
        results.push({
          path: file.path,
          charCount: file.content.length,
          tokenCount: tokenCounts[fileIdx],
        });
      }
    }

    progressCallback(`Calculating metrics... (${filesToProcess.length}/${filesToProcess.length}) ${pc.dim('done')}`);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
