import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from './fileTypes.js';
import type { FileCollectResult, FileCollectTask, SkippedFileInfo } from './workers/fileCollectWorker.js';

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
}

// Re-export SkippedFileInfo for external use
export type { SkippedFileInfo } from './workers/fileCollectWorker.js';

export const collectFiles = async (
  filePaths: string[],
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  deps = {
    initTaskRunner,
  },
): Promise<FileCollectResults> => {
  const taskRunner = deps.initTaskRunner<FileCollectTask, FileCollectResult>({
    numOfTasks: filePaths.length,
    workerType: 'fileCollect',
    runtime: 'worker_threads',
  });
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
        taskRunner.run(task).then((result) => {
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

    const rawFiles: RawFile[] = [];
    const skippedFiles: SkippedFileInfo[] = [];

    for (const result of results) {
      if (result.rawFile) {
        rawFiles.push(result.rawFile);
      }
      if (result.skippedFile) {
        skippedFiles.push(result.skippedFile);
      }
    }

    return { rawFiles, skippedFiles };
  } catch (error) {
    logger.error('Error during file collection:', error);
    throw error;
  } finally {
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};
