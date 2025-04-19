import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initPiscina } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from './fileTypes.js';
import type { FileCollectTask } from './workers/fileCollectWorker.js';

const initTaskRunner = (numOfTasks: number) => {
  const pool = initPiscina(numOfTasks, new URL('./workers/fileCollectWorker.js', import.meta.url).href);
  return (task: FileCollectTask) => pool.run(task);
};

export const collectFiles = async (
  filePaths: string[],
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  deps = {
    initTaskRunner,
  },
): Promise<RawFile[]> => {
  const runTask = deps.initTaskRunner(filePaths.length);
  const tasks = filePaths.map(
    (filePath) =>
      ({
        filePath,
        rootDir,
        maxFileSize: config.input.maxFileSize,
      }) satisfies FileCollectTask,
  );

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file collection for ${filePaths.length} files using worker pool`);

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const results = await Promise.all(
      tasks.map((task) =>
        runTask(task).then((result) => {
          completedTasks++;
          progressCallback(`Collect file... (${completedTasks}/${totalTasks}) ${pc.dim(task.filePath)}`);
          logger.trace(`Collect files... (${completedTasks}/${totalTasks}) ${task.filePath}`);
          return result;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

    return results.filter((file): file is RawFile => file !== null);
  } catch (error) {
    logger.error('Error during file collection:', error);
    throw error;
  }
};
