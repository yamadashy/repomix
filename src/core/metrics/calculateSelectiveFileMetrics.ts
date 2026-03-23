import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenCountEncoding } from './TokenCounter.js';
import type { BatchTokenCountTask, TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

// Threshold: use batched tasks when file count exceeds this.
// Below this, per-file tasks have acceptable overhead.
const BATCH_THRESHOLD = 50;

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenCountEncoding,
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

    let results: FileMetrics[];

    if (filesToProcess.length > BATCH_THRESHOLD) {
      // Batch mode: group files into CPU-proportional batches to reduce per-task overhead.
      // With 974 files and 4 CPUs, this creates ~8 batches instead of 974 individual tasks,
      // eliminating ~966 structured clones and Promise allocations.
      const numBatches = getProcessConcurrency() * 2;
      const batchSize = Math.ceil(filesToProcess.length / numBatches);
      const batches: ProcessedFile[][] = [];
      for (let i = 0; i < filesToProcess.length; i += batchSize) {
        batches.push(filesToProcess.slice(i, i + batchSize));
      }

      // Cast taskRunner to accept batch tasks — the worker handles both types at runtime.
      // biome-ignore lint/suspicious/noExplicitAny: Tinypool serializes any task via structured clone
      const batchRunner = deps.taskRunner as TaskRunner<any, any>;
      const batchResults = await Promise.all(
        batches.map(async (batch) => {
          const task: BatchTokenCountTask = {
            files: batch.map((file) => ({ content: file.content, path: file.path })),
            encoding: tokenCounterEncoding,
            batch: true,
          };
          return (await batchRunner.run(task)) as Array<{ path: string; tokenCount: number }>;
        }),
      );

      // Flatten batch results and build FileMetrics with char counts
      const charCountMap = new Map(filesToProcess.map((f) => [f.path, f.content.length]));
      results = batchResults.flat().map((r) => ({
        path: r.path,
        charCount: charCountMap.get(r.path) ?? 0,
        tokenCount: r.tokenCount,
      }));

      progressCallback(`Calculating metrics... (${filesToProcess.length}/${filesToProcess.length}) ${pc.dim('done')}`);
    } else {
      // Individual mode: small number of files, per-file tasks are fine
      let completedTasks = 0;
      results = await Promise.all(
        filesToProcess.map(async (file) => {
          const tokenCount = await deps.taskRunner.run({
            content: file.content,
            encoding: tokenCounterEncoding,
            path: file.path,
          });

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
