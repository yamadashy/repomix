import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchTask, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Minimum number of files to trigger batching; below this, individual tasks are fine
const BATCH_THRESHOLD = 50;

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

    let results: FileMetrics[];

    if (filesToProcess.length >= BATCH_THRESHOLD) {
      results = await calculateWithBatching(filesToProcess, tokenCounterEncoding, progressCallback, deps);
    } else {
      results = await calculateIndividually(filesToProcess, tokenCounterEncoding, progressCallback, deps);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};

const calculateWithBatching = async (
  filesToProcess: ProcessedFile[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountTask | TokenCountBatchTask, number | number[]> },
): Promise<FileMetrics[]> => {
  const concurrency = getProcessConcurrency();
  const numBatches = Math.max(1, Math.min(concurrency * 2, Math.ceil(filesToProcess.length / 25)));
  const batchSize = Math.ceil(filesToProcess.length / numBatches);

  logger.trace(`Batching ${filesToProcess.length} files into ${numBatches} batches of ~${batchSize} files`);

  const batches: ProcessedFile[][] = [];
  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    batches.push(filesToProcess.slice(i, i + batchSize));
  }

  let completedFiles = 0;
  const totalFiles = filesToProcess.length;

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const batchTask: TokenCountBatchTask = {
        batch: batch.map((file) => ({ content: file.content, path: file.path })),
        encoding: tokenCounterEncoding,
      };

      const result = await deps.taskRunner.run(batchTask);
      const tokenCounts = result as number[];

      if (!Array.isArray(tokenCounts) || tokenCounts.length !== batch.length) {
        throw new Error(
          `Batch token counting returned ${Array.isArray(tokenCounts) ? tokenCounts.length : typeof tokenCounts} results for ${batch.length} files`,
        );
      }

      const metrics: FileMetrics[] = batch.map((file, idx) => ({
        path: file.path,
        charCount: file.content.length,
        tokenCount: tokenCounts[idx],
      }));

      completedFiles += batch.length;
      progressCallback(
        `Calculating metrics... (${completedFiles}/${totalFiles}) ${pc.dim(batch[batch.length - 1].path)}`,
      );
      logger.trace(`Batch metrics completed: ${batch.length} files (${completedFiles}/${totalFiles})`);

      return metrics;
    }),
  );

  return batchResults.flat();
};

const calculateIndividually = async (
  filesToProcess: ProcessedFile[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountTask | TokenCountBatchTask, number | number[]> },
): Promise<FileMetrics[]> => {
  let completedTasks = 0;
  const results = await Promise.all(
    filesToProcess.map(async (file) => {
      const tokenCount = (await deps.taskRunner.run({
        content: file.content,
        encoding: tokenCounterEncoding,
        path: file.path,
      })) as number;

      const result: FileMetrics = {
        path: file.path,
        charCount: file.content.length,
        tokenCount,
      };

      completedTasks++;
      progressCallback(`Calculating metrics... (${completedTasks}/${filesToProcess.length}) ${pc.dim(file.path)}`);
      logger.trace(`Calculating metrics... (${completedTasks}/${filesToProcess.length}) ${file.path}`);
      return result;
    }),
  );

  return results;
};
