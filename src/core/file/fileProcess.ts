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
 * Check if file processing requires CPU-intensive operations that benefit from worker threads.
 * Only `compress` (tree-sitter parsing) and `removeComments` (language-specific AST manipulation)
 * are heavy enough to justify worker thread overhead.
 */
const needsWorkerProcessing = (config: RepomixConfigMerged): boolean => {
  return config.output.compress || config.output.removeComments;
};

/**
 * Apply transforms that must run before compress/tree-sitter parsing.
 * Runs on the main thread to avoid duplication in workers.
 * Handles: truncateBase64 (reduces input size for tree-sitter), removeEmptyLines (affects chunk merging).
 */
export const applyPreCompressTransforms = (
  files: ProcessedFile[],
  config: RepomixConfigMerged,
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

    results[i] = { path: file.path, content };
  }

  return results;
};

/**
 * Apply transforms that run after compress/worker processing.
 * Handles: trim, showLineNumbers.
 */
export const applyPostCompressTransforms = (
  files: ProcessedFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
): ProcessedFile[] => {
  const totalFiles = files.length;
  const results: ProcessedFile[] = Array.from({ length: totalFiles }) as ProcessedFile[];

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    let content = file.content.trim();

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

export const processFiles = async (
  rawFiles: RawFile[],
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback,
  deps: {
    initTaskRunner: typeof initTaskRunner;
    getFileManipulator: GetFileManipulator;
  } | null = null,
): Promise<ProcessedFile[]> => {
  const resolvedDeps = deps ?? {
    initTaskRunner,
    getFileManipulator,
  };

  const startTime = process.hrtime.bigint();
  const inputFiles = rawFiles.map((rawFile) => ({ path: rawFile.path, content: rawFile.content }));

  // Transform order must be preserved: truncateBase64 → removeComments → removeEmptyLines → trim → compress → showLineNumbers
  // Pre-compress transforms run on main thread before workers to ensure tree-sitter receives
  // truncated base64 (avoids parsing multi-MB strings) and content without empty lines (affects chunk merging).
  const preProcessed = applyPreCompressTransforms(inputFiles, config, resolvedDeps);

  let files: ProcessedFile[];

  if (needsWorkerProcessing(config)) {
    // Phase 2: Heavy processing via workers (removeComments, compress)
    logger.trace(`Starting file processing for ${rawFiles.length} files using worker pool`);

    const taskRunner = resolvedDeps.initTaskRunner<FileProcessTask, ProcessedFile>({
      numOfTasks: rawFiles.length,
      workerType: 'fileProcess',
      runtime: 'worker_threads',
    });

    const tasks = preProcessed.map(
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

    // Phase 3: Post-compress transforms (no progress - already reported by workers)
    files = applyPostCompressTransforms(files, config, () => {});
  } else {
    // No heavy processing needed - apply post-compress transforms directly
    logger.trace(`Starting file processing for ${rawFiles.length} files in main thread (lightweight mode)`);
    files = applyPostCompressTransforms(preProcessed, config, progressCallback);
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);

  return files;
};
