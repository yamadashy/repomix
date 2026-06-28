import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { type FileInclusionLevel, resolveFileLevel } from './fileLevelResolve.js';
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
  // Optional precomputed inclusion levels keyed by file path. When provided,
  // the showLineNumbers guard reuses them instead of recomputing via
  // resolveFileLevel; callers without the map fall back to recomputing.
  fileLevels?: Map<string, FileInclusionLevel>,
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

    // Line numbers are suppressed for compressed files (their content is
    // restructured signatures, not line-faithful source), matching the global
    // compress behavior on a per-file basis.
    const level = fileLevels?.get(file.path) ?? resolveFileLevel(file.path, config.output);
    if (config.output.showLineNumbers && level !== 'compress') {
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

  // Use each file's inclusion level, normally precomputed by the packager against
  // the per-root-relative path (the same basis include/ignore use) and threaded on
  // rawFile.level, falling back to resolving it from the path for callers that
  // build RawFiles directly. Files at the 'directory-only' level are dropped from
  // the content output entirely — their paths still appear in the directory
  // structure, which is built from the search results rather than from
  // processedFiles. The levels are cached by path and reused by
  // applyLightweightTransforms so the glob matching is not repeated.
  const fileLevels = new Map<string, FileInclusionLevel>();
  const leveledFiles = rawFiles.flatMap((rawFile) => {
    const level = rawFile.level ?? resolveFileLevel(rawFile.path, config.output);
    fileLevels.set(rawFile.path, level);
    return level !== 'directory-only' ? [{ rawFile, level }] : [];
  });

  // Only compress (tree-sitter) and removeComments (AST manipulation) justify worker thread overhead.
  // Compression can be requested globally or per-file via output.patterns, so check the resolved
  // levels rather than the global compress flag alone.
  const needsCompression = leveledFiles.some((entry) => entry.level === 'compress');
  const useWorkers = needsCompression || config.output.removeComments;

  if (useWorkers) {
    // Phase 1: Heavy processing via workers (removeComments, compress)
    logger.trace(`Starting file processing for ${leveledFiles.length} files using worker pool`);

    const taskRunner = deps.initTaskRunner<FileProcessTask, ProcessedFile>({
      numOfTasks: leveledFiles.length,
      workerType: 'fileProcess',
      runtime: 'worker_threads',
    });

    const tasks = leveledFiles.map(
      ({ rawFile, level }) =>
        ({
          rawFile,
          config,
          level,
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
    files = applyLightweightTransforms(files, config, () => {}, deps, fileLevels);
  } else {
    // No heavy processing needed - apply lightweight transforms directly
    logger.trace(`Starting file processing for ${leveledFiles.length} files in main thread (lightweight mode)`);
    const inputFiles = leveledFiles.map(({ rawFile }) => ({ path: rawFile.path, content: rawFile.content }));
    files = applyLightweightTransforms(inputFiles, config, progressCallback, deps, fileLevels);
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File processing completed in ${duration.toFixed(2)}ms`);

  return files;
};
