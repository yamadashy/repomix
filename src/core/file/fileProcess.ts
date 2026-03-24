import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { initTaskRunner as InitTaskRunnerType } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { type FileManipulator, getFileManipulator } from './fileManipulate.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';
import type { FileProcessTask } from './workers/fileProcessWorker.js';

type GetFileManipulator = (filePath: string) => FileManipulator | null;

// Lazy-load tinypool — defers ~20ms of module loading until file processing actually starts,
// reducing worker process startup time so the worker is ready to receive tasks sooner.
let _initTaskRunner: typeof InitTaskRunnerType | undefined;
const getInitTaskRunner = async (): Promise<typeof InitTaskRunnerType> => {
  if (!_initTaskRunner) {
    const mod = await import('../../shared/processConcurrency.js');
    _initTaskRunner = mod.initTaskRunner;
  }
  return _initTaskRunner;
};

export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: {
    initTaskRunner: typeof InitTaskRunnerType;
    getFileManipulator: GetFileManipulator;
  } | null = null,
): Promise<ProcessedFile[]> => {
  const resolvedDeps = deps ?? {
    initTaskRunner: await getInitTaskRunner(),
    getFileManipulator,
  };
  const taskRunner = resolvedDeps.initTaskRunner<FileProcessTask, ProcessedFile>({
    numOfTasks: rawFiles.length,
    workerType: 'fileProcess',
    // High memory usage and leak risk
    runtime: 'worker_threads',
  });
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
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};
