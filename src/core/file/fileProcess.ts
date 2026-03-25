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

/**
 * Check if file processing requires CPU-intensive operations that benefit from worker threads.
 * Only `compress` (tree-sitter parsing) and `removeComments` (language-specific AST manipulation)
 * are heavy enough to justify worker thread overhead (startup, structured clone, teardown).
 * Lightweight operations (truncateBase64, removeEmptyLines, showLineNumbers, trim) run faster
 * in the main thread by avoiding ~100-200ms of worker pool overhead.
 */
const needsWorkerProcessing = (config: RepomixConfigMerged): boolean => {
  return config.output.compress || config.output.removeComments;
};

/**
 * Process files in the main thread for lightweight operations.
 * Avoids worker pool startup (~50ms), structured clone overhead for all file contents,
 * and worker teardown. Used when only truncateBase64, removeEmptyLines, showLineNumbers,
 * and/or trim are needed.
 */
const processFilesMainThread = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
): Promise<ProcessedFile[]> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file processing for ${rawFiles.length} files in main thread (lightweight mode)`);

  // Lazy-load truncateBase64 only when needed
  let truncateBase64Content: ((content: string) => string) | undefined;
  if (config.output.truncateBase64) {
    const mod = await import('./truncateBase64.js');
    truncateBase64Content = mod.truncateBase64Content;
  }

  const totalFiles = rawFiles.length;
  const results: ProcessedFile[] = new Array(totalFiles);

  for (let i = 0; i < totalFiles; i++) {
    const rawFile = rawFiles[i];
    let content = rawFile.content;

    if (truncateBase64Content) {
      content = truncateBase64Content(content);
    }

    if (config.output.removeEmptyLines) {
      const manipulator = getFileManipulator(rawFile.path);
      if (manipulator) {
        content = manipulator.removeEmptyLines(content);
      }
    }

    content = content.trim();

    if (config.output.showLineNumbers) {
      const lines = content.split('\n');
      const padding = lines.length.toString().length;
      // Mutate in-place instead of creating a new array via .map()
      // to avoid allocating 2 arrays of N strings for each file.
      for (let j = 0; j < lines.length; j++) {
        lines[j] = `${(j + 1).toString().padStart(padding)}: ${lines[j]}`;
      }
      content = lines.join('\n');
    }

    results[i] = { path: rawFile.path, content };

    if ((i + 1) % 50 === 0 || i === totalFiles - 1) {
      progressCallback(`Processing file... (${i + 1}/${totalFiles}) ${pc.dim(rawFile.path)}`);
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File processing completed in ${duration.toFixed(2)}ms (main thread)`);

  return results;
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
  // For lightweight processing (no compress/removeComments), skip worker pool entirely.
  // This avoids ~100-200ms of worker startup + structured clone + teardown overhead.
  if (!needsWorkerProcessing(config) && deps === null) {
    return processFilesMainThread(rawFiles, config, progressCallback);
  }

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
    // Fire-and-forget worker pool cleanup — all results are already collected,
    // so we don't need to block the critical path waiting for thread termination.
    // Matches the pattern used in securityCheck.ts for consistency.
    Promise.resolve(taskRunner.cleanup()).catch((cleanupError) => {
      logger.debug('Error during file process worker pool cleanup:', cleanupError);
    });
  }
};
