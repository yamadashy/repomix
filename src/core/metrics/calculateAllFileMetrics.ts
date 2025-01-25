import pc from 'picocolors';
import type { TiktokenEncoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';
import { initPiscina } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { FileMetricsTask } from './workers/fileMetricsWorker.js';
import type { FileMetrics } from './workers/types.js';

const initTaskRunner = (numOfTasks: number) => {
  const pool = initPiscina(numOfTasks, new URL('./workers/fileMetricsWorker.js', import.meta.url).href);
  return (task: FileMetricsTask) => pool.run(task);
};

export const calculateAllFileMetrics = async (
  processedFiles: ProcessedFile[],
  tokenCounterEncoding: TiktokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps = {
    initTaskRunner,
  },
): Promise<FileMetrics[]> => {
  const runTask = deps.initTaskRunner(processedFiles.length);
  const tasks = processedFiles.map(
    (file, index) =>
      ({
        file,
        index,
        totalFiles: processedFiles.length,
        encoding: tokenCounterEncoding,
      }) satisfies FileMetricsTask,
  );

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting metrics calculation for ${processedFiles.length} files using worker pool`);

    let completedTasks = 0;
    const results = await Promise.all(
      tasks.map((task) =>
        runTask(task).then((result) => {
          completedTasks++;
          progressCallback(`Calculating metrics... (${completedTasks}/${task.totalFiles}) ${pc.dim(task.file.path)}`);
          return result;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during metrics calculation:', error);
    throw error;
  }
};
