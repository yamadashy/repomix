import pc from 'picocolors';
import type { TiktokenEncoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';
import { initTaskRunner, type WorkerConfig } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { FileMetricsTask } from './workers/fileMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TiktokenEncoding,
  progressCallback: RepomixProgressCallback,
  workerConfig?: WorkerConfig,
  deps = {
    initTaskRunner,
  },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  const taskRunner = deps.initTaskRunner<FileMetricsTask, FileMetrics>(
    filesToProcess.length,
    new URL('./workers/fileMetricsWorker.js', import.meta.url).href,
    workerConfig,
  );
  const tasks = filesToProcess.map(
    (file, index) =>
      ({
        file,
        index,
        totalFiles: filesToProcess.length,
        encoding: tokenCounterEncoding,
      }) satisfies FileMetricsTask,
  );

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files using worker pool`);

    let completedTasks = 0;
    const results = await Promise.all(
      tasks.map((task) =>
        taskRunner.run(task).then((result) => {
          completedTasks++;
          progressCallback(`Calculating metrics... (${completedTasks}/${task.totalFiles}) ${pc.dim(task.file.path)}`);
          logger.trace(`Calculating metrics... (${completedTasks}/${task.totalFiles}) ${task.file.path}`);
          return result;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  } finally {
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};
