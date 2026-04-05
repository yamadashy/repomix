import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { type FileManipulator, getFileManipulator } from './fileManipulate.js';
import type { ProcessedFile, RawFile } from './fileTypes.js';
import { truncateBase64Content } from './truncateBase64.js';
import type { FileProcessTask } from './workers/fileProcessWorker.js';

type GetFileManipulator = (filePath: string) => FileManipulator | null;

/**
 * Apply lightweight transforms on the main thread after worker processing.
 * All lightweight transforms are centralized here to avoid duplication with workers.
 *
 * Transform order: [removeComments → compress] (worker) → truncateBase64 → removeEmptyLines → trim → showLineNumbers
 * - removeEmptyLines runs after removeComments so that empty lines created by comment removal are cleaned up.
 */
export const applyLightweightTransforms = (
  files: ProcessedFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: { getFileManipulator: GetFileManipulator },
): ProcessedFile[] => {
  const totalFiles = files.length;
  const results: ProcessedFile[] = Array.from({ length: totalFiles }) as ProcessedFile[];

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    let content = file.content;

    if (config.output.truncateBase64) {
      content = truncateBase64Content(content);
    }

    if (config.output.removeEmptyLines) {
      const manipulator = deps.getFileManipulator(file.path);
      if (manipulator) {
        content = manipulator.removeEmptyLines(content);
      }
    }

    content = content.trim();

    if (config.output.showLineNumbers && !config.output.compress) {
      const lines = content.split('\n');
      const padding = lines.length.toString().length;
      const numberedLines = lines.map((line, idx) => `${(idx + 1).toString().padStart(padding)}: ${line}`);
      content = numberedLines.join('\n');
    }

    results[i] = { path: file.path, content };

    if ((i + 1) % 50 === 0 || i === totalFiles - 1) {
      progressCallback(`Processing file... (${i + 1}/${totalFiles}) ${pc.dim(file.path)}`);
    }
  }

  return results;
};

/**
 * Process files through a two-phase pipeline:
 *
 * 1. Heavy transforms (worker threads, skipped when not needed):
 *    removeComments → compress
 *
 * 2. Lightweight transforms (main thread, always applied):
 *    truncateBase64 → removeEmptyLines → trim → showLineNumbers
 *
 * removeEmptyLines intentionally runs after removeComments so that
 * empty lines created by comment removal are cleaned up.
 */
export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps = {
    initTaskRunner,
    getFileManipulator,
  },
): Promise<ProcessedFile[]> => {
  const startTime = process.hrtime.bigint();
  let files: ProcessedFile[];

  // Only compress (tree-sitter) and removeComments (AST manipulation) justify worker thread overhead
  const useWorkers = config.output.compress || config.output.removeComments;

  if (useWorkers) {
    // Phase 1: Heavy processing via workers (removeComments, compress)
    logger.trace(`Starting file processing for ${rawFiles.length} files using worker pool`);

    const taskRunner = deps.initTaskRunner<FileProcessTask, ProcessedFile>({
      numOfTasks: rawFiles.length,
      workerType: 'fileProcess',
      runtime: 'worker_threads',
    });

    const sortedFiles = [...rawFiles].sort((a, b) => b.content.length - a.content.length);

    const tasks = sortedFiles.map(
      (rawFile) =>
        ({
          rawFile,
          config,
        }) satisfies FileProcessTask,
    );

    try {
      let completedTasks = 0;
      const totalTasks = tasks.length;

      files = await Promise.all(
        tasks.map((task) =>
          taskRunner.run(task).then((result) => {
            completedTasks++;
            progressCallback(`Processing file... (${completedTasks}/${totalTasks}) ${pc.dim(task.rawFile.path)}`);
            logger.trace(`Processing file... (${completedTasks}/${totalTasks}) ${task.rawFile.path}`);
            return result;
          }),
        ),
      );
    } catch (error) {
      logger.error('Error during file processing:', error);
      throw error;
    } finally {
      await taskRunner.cleanup();
    }

    // Phase 2: Lightweight transforms (no progress - already reported by workers)
    files = applyLightweightTransforms(files, config, () => {}, deps);
  } else {
    // No heavy processing needed - apply lightweight transforms directly
    logger.trace(`Starting file processing for ${rawFiles.length} files in main thread (lightweight mode)`);
    const inputFiles = rawFiles.map((rawFile) => ({ path: rawFile.path, content: rawFile.content }));
    files = applyLightweightTransforms(inputFiles, config, progressCallback, deps);
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);

  return files;
};
