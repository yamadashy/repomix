import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles
    .filter((file) => targetFileSet.has(file.path))
    .sort((a, b) => b.content.length - a.content.length);

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    let completedTasks = 0;
    const results = await Promise.all(
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

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
