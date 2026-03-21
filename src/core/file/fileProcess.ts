import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { type FileManipulator, getFileManipulator } from './fileManipulate.js';
import { processContent } from './fileProcessContent.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';
import type { FileProcessTask } from './workers/fileProcessWorker.js';

type GetFileManipulator = (filePath: string) => FileManipulator | null;

/**
 * Check whether file processing requires worker threads.
 * Only `compress` mode (tree-sitter parsing) is CPU-heavy enough to benefit from workers.
 * All other transformations (truncateBase64, removeComments, removeEmptyLines, showLineNumbers, trim)
 * are lightweight regex/string operations where worker overhead (pool creation, structured clone
 * serialization of all file content, message passing) far exceeds the computation cost.
 */
const needsWorkerThreads = (config: RepomixConfigMerged): boolean => {
  return !!config.output.compress;
};

export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: {
    initTaskRunner: typeof initTaskRunner;
    getFileManipulator: GetFileManipulator;
    processContent: typeof processContent;
  } = {
    initTaskRunner,
    getFileManipulator,
    processContent,
  },
): Promise<ProcessedFile[]> => {
  // For lightweight transformations (no compress), process on main thread to avoid
  // worker pool overhead (~400ms savings on a ~1000-file repo).
  if (!needsWorkerThreads(config)) {
    return processFilesMainThread(rawFiles, config, progressCallback, deps);
  }

  return processFilesWorkerThreads(rawFiles, config, progressCallback, deps);
};

/**
 * Process files on the main thread. Suitable for lightweight transformations
 * (truncateBase64, removeComments, removeEmptyLines, showLineNumbers, trim)
 * where the computation cost per file is negligible (~0.1ms) and worker thread
 * overhead (structured clone, message passing) would dominate.
 */
const processFilesMainThread = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: {
    processContent: typeof processContent;
  },
): Promise<ProcessedFile[]> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file processing for ${rawFiles.length} files on main thread`);

  const results: ProcessedFile[] = [];
  const totalFiles = rawFiles.length;

  for (let i = 0; i < rawFiles.length; i++) {
    const rawFile = rawFiles[i];
    const content = await deps.processContent(rawFile, config);
    results.push({ path: rawFile.path, content });

    // Report progress periodically (every 100 files) to avoid excessive callback overhead
    if ((i + 1) % 100 === 0 || i === rawFiles.length - 1) {
      progressCallback(`Processing file... (${i + 1}/${totalFiles}) ${pc.dim(rawFile.path)}`);
      logger.trace(`Processing file... (${i + 1}/${totalFiles}) ${rawFile.path}`);
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File processing completed in ${duration.toFixed(2)}ms (main thread)`);

  return results;
};

/**
 * Process files using worker threads. Used when compress mode is enabled,
 * as tree-sitter parsing is CPU-heavy and benefits from parallelism.
 */
const processFilesWorkerThreads = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: {
    initTaskRunner: typeof initTaskRunner;
  },
): Promise<ProcessedFile[]> => {
  const taskRunner = deps.initTaskRunner<FileProcessTask, ProcessedFile>({
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
