import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';
import type { FileProcessTask } from './workers/fileProcessWorker.js';

/**
 * Pre-create a file process task runner so worker threads can start loading
 * modules while other stages (e.g., security check) are running.
 */
export const createFileProcessTaskRunner = (numOfTasks: number): TaskRunner<FileProcessTask, ProcessedFile> =>
  initTaskRunner<FileProcessTask, ProcessedFile>({
    numOfTasks,
    workerType: 'fileProcess',
    runtime: 'worker_threads',
  });

const defaultProcessFilesDeps = {
  initTaskRunner,
  taskRunner: undefined as TaskRunner<FileProcessTask, ProcessedFile> | undefined,
};

export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  overrideDeps: Partial<typeof defaultProcessFilesDeps> = {},
): Promise<ProcessedFile[]> => {
  const deps = { ...defaultProcessFilesDeps, ...overrideDeps };

  // Use pre-warmed task runner if provided, otherwise create one
  const taskRunner =
    deps.taskRunner ??
    deps.initTaskRunner<FileProcessTask, ProcessedFile>({
      numOfTasks: rawFiles.length,
      workerType: 'fileProcess',
      runtime: 'worker_threads',
    });
  const ownTaskRunner = !deps.taskRunner;

  const tasks = rawFiles.map(
    (rawFile, _index) =>
      ({
        rawFile,
        config,
      }) satisfies FileProcessTask,
  );

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file processing for ${rawFiles.length} files using worker pool`);

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const results = await Promise.all(
      tasks.map((task) =>
        taskRunner.run(task).then((result) => {
          completedTasks++;
          progressCallback(`Processing file... (${completedTasks}/${totalTasks}) ${pc.dim(task.rawFile.path)}`);
          logger.trace(`Processing file... (${completedTasks}/${totalTasks}) ${task.rawFile.path}`);
          return result;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during file processing:', error);
    throw error;
  } finally {
    // Only cleanup if we created the task runner
    if (ownTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
