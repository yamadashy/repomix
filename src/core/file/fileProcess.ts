import os from 'node:os';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger, repomixLogLevels } from '../../shared/logger.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { processContent } from './fileProcessContent.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';
import type { FileProcessBatchTask } from './workers/fileProcessWorker.js';

type BatchTaskRunner = TaskRunner<FileProcessBatchTask, ProcessedFile[]>;

/**
 * Check if file processing requires worker threads.
 * Worker threads are needed for CPU-heavy operations (compress, removeComments)
 * where parallel execution outweighs structured clone overhead.
 * For lightweight ops (truncateBase64 + trim), main thread is ~4x faster
 * because it avoids structured clone serialization of all file content.
 */
export const needsWorkerThreads = (config: RepomixConfigMerged): boolean => {
  return !!config.output.compress || !!config.output.removeComments;
};

/**
 * Pre-create a file process task runner so worker threads can start loading
 * modules while other stages (e.g., security check) are running.
 * Only needed when config requires heavy processing (compress/removeComments).
 */
export const createFileProcessTaskRunner = (numOfTasks: number): BatchTaskRunner =>
  initTaskRunner<FileProcessBatchTask, ProcessedFile[]>({
    numOfTasks,
    workerType: 'fileProcess',
    runtime: 'worker_threads',
  });

const defaultProcessFilesDeps = {
  initTaskRunner,
  processContent,
  taskRunner: undefined as BatchTaskRunner | undefined,
};

export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  overrideDeps: Partial<typeof defaultProcessFilesDeps> = {},
): Promise<ProcessedFile[]> => {
  const deps = { ...defaultProcessFilesDeps, ...overrideDeps };

  // For lightweight processing (no compress, no removeComments), run directly
  // on the main thread. This avoids structured clone serialization of ~3.5MB
  // of file content (both directions), which is ~4x faster than worker threads
  // for these trivial operations (truncateBase64 + trim).
  if (!needsWorkerThreads(config)) {
    return processFilesMainThread(rawFiles, config, progressCallback, deps);
  }

  return processFilesWorkerThreads(rawFiles, config, progressCallback, deps);
};

const processFilesMainThread = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: typeof defaultProcessFilesDeps,
): Promise<ProcessedFile[]> => {
  const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;
  const startTime = isTracing ? process.hrtime.bigint() : 0n;

  if (isTracing) {
    logger.trace(`Starting file processing for ${rawFiles.length} files on main thread`);
  }

  const results: ProcessedFile[] = [];
  for (let i = 0; i < rawFiles.length; i++) {
    const rawFile = rawFiles[i];
    const content = await deps.processContent(rawFile, config);
    results.push({ path: rawFile.path, content });
  }

  progressCallback(`Processing file... (${rawFiles.length}/${rawFiles.length}) ${pc.dim('done')}`);

  if (isTracing) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);
  }

  return results;
};

const processFilesWorkerThreads = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: typeof defaultProcessFilesDeps,
): Promise<ProcessedFile[]> => {
  // Use pre-warmed task runner if provided, otherwise create one
  const taskRunner =
    deps.taskRunner ??
    deps.initTaskRunner<FileProcessBatchTask, ProcessedFile[]>({
      numOfTasks: rawFiles.length,
      workerType: 'fileProcess',
      runtime: 'worker_threads',
    });
  const ownTaskRunner = !deps.taskRunner;

  // Batch files into CPU-proportional chunks to reduce structured clone + message passing
  // overhead. Without batching, config is cloned ~1000 times (once per file). With batching,
  // config is cloned only numCPUs*2 times (~8 for 4 CPUs), reducing overhead by ~125x.
  const numCPUs = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  const numBatches = Math.max(1, Math.min(rawFiles.length, numCPUs * 2));
  const batchSize = Math.ceil(rawFiles.length / numBatches);

  const batches: FileProcessBatchTask[] = [];
  for (let i = 0; i < rawFiles.length; i += batchSize) {
    batches.push({ batch: rawFiles.slice(i, i + batchSize), config });
  }

  const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;

  try {
    const startTime = isTracing ? process.hrtime.bigint() : 0n;

    if (isTracing) {
      logger.trace(
        `Starting file processing for ${rawFiles.length} files using worker pool (${batches.length} batches)`,
      );
    }

    let completedTasks = 0;
    const totalTasks = rawFiles.length;

    const batchResults = await Promise.all(
      batches.map((batchTask) =>
        taskRunner.run(batchTask).then((results) => {
          completedTasks += batchTask.batch.length;
          const lastFile = batchTask.batch[batchTask.batch.length - 1];
          progressCallback(`Processing file... (${completedTasks}/${totalTasks}) ${pc.dim(lastFile.path)}`);
          if (isTracing) {
            logger.trace(`Processing file... (${completedTasks}/${totalTasks}) ${lastFile.path}`);
          }
          return results;
        }),
      ),
    );

    if (isTracing) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;
      logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);
    }

    // Flatten batch results preserving order
    return batchResults.flat();
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
