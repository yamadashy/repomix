import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import { promisePool } from '../../shared/promisePool.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { type FileManipulator, getFileManipulator } from './fileManipulate.js';
import { processContent } from './fileProcessContent.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';
import type { FileProcessTask } from './workers/fileProcessWorker.js';

type GetFileManipulator = (filePath: string) => FileManipulator | null;

// Concurrency limit for main-thread file processing.
// File processing is CPU-bound (regex/string ops), so concurrency here just
// controls how many async processContent calls are in-flight at once.
const FILE_PROCESS_CONCURRENCY = 50;

/**
 * Check whether file processing requires worker threads.
 * Only compress mode (tree-sitter parsing) is CPU-heavy enough to benefit from workers.
 * All other transformations (truncateBase64, removeComments, removeEmptyLines, showLineNumbers, trim)
 * are lightweight regex/string operations where worker overhead (pool creation, structured clone,
 * message passing) exceeds the computation cost.
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
  // worker pool overhead (pool creation, structured clone of all file content,
  // message passing per file, WASM module loading in each worker thread).
  if (!needsWorkerThreads(config)) {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file processing for ${rawFiles.length} files on main thread`);

    let completedTasks = 0;
    const totalTasks = rawFiles.length;

    const results = await promisePool(rawFiles, FILE_PROCESS_CONCURRENCY, async (rawFile) => {
      const content = await deps.processContent(rawFile, config);
      completedTasks++;
      progressCallback(`Processing file... (${completedTasks}/${totalTasks}) ${pc.dim(rawFile.path)}`);
      logger.trace(`Processing file... (${completedTasks}/${totalTasks}) ${rawFile.path}`);
      return { path: rawFile.path, content };
    });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);

    return results;
  }

  // Compress mode: use worker threads for CPU-heavy tree-sitter parsing
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
