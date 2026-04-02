import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchResult, TokenCountBatchTask, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Target ~200KB of content per batch to balance worker round-trip overhead against task granularity.
// With ~992 files totaling ~4MB, this yields ~20 batches instead of ~992 individual tasks,
// reducing worker thread message-passing overhead by ~98%.
const TARGET_CHARS_PER_BATCH = 200_000;

const createBatches = (files: ProcessedFile[]): ProcessedFile[][] => {
  const batches: ProcessedFile[][] = [];
  let currentBatch: ProcessedFile[] = [];
  let currentSize = 0;

  for (const file of files) {
    currentBatch.push(file);
    currentSize += file.content.length;
    if (currentSize >= TARGET_CHARS_PER_BATCH) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

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

    const batches = createBatches(filesToProcess);
    logger.trace(`Created ${batches.length} batches from ${filesToProcess.length} files`);

    let completedFiles = 0;
    const totalFiles = filesToProcess.length;

    const batchResultArrays = await Promise.all(
      batches.map(async (batch) => {
        const batchTask: TokenCountBatchTask = {
          batch: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        };

        // Cast needed: the underlying Tinypool pool handles both single and batch tasks,
        // but the TaskRunner generic is typed for single tasks. The worker detects batch
        // tasks via the 'batch' property and returns TokenCountBatchResult.
        const run = deps.taskRunner.run as unknown as (task: TokenCountBatchTask) => Promise<TokenCountBatchResult>;
        const result = await run(batchTask);

        const fileResults: FileMetrics[] = batch.map((file, index) => ({
          path: file.path,
          charCount: file.content.length,
          tokenCount: result.tokenCounts[index],
        }));

        completedFiles += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(`Calculating metrics... (${completedFiles}/${totalFiles}) ${pc.dim(lastFile.path)}`);
        logger.trace(`Calculating metrics... (${completedFiles}/${totalFiles}) ${lastFile.path}`);

        return fileResults;
      }),
    );

    const results = batchResultArrays.flat();

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
