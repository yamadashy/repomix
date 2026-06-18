import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { readRawFile as defaultReadRawFile, type FileSkipReason } from './fileRead.js';
import type { RawFile } from './fileTypes.js';

// Concurrency limit for parallel file reads on the main thread.
// 50 balances I/O throughput with FD/memory safety across different machines.
const FILE_COLLECT_CONCURRENCY = 50;

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
}

export interface CollectFilesOptions {
  // Invoked as soon as each file's content is read (in completion order, not
  // path order), letting downstream consumers — e.g. the streaming security
  // check — start working while the remaining reads are still in flight.
  // Only called for files that end up in rawFiles, never for skipped files.
  onFileCollected?: (file: RawFile) => void;
}

const promisePool = async <T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
};

export const collectFiles = async (
  filePaths: string[],
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  options: CollectFilesOptions = {},
  deps = {
    readRawFile: defaultReadRawFile,
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  let completedTasks = 0;
  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  const results = await promisePool(filePaths, FILE_COLLECT_CONCURRENCY, async (filePath) => {
    const fullPath = path.resolve(rootDir, filePath);
    const result = await deps.readRawFile(fullPath, maxFileSize);

    completedTasks++;
    progressCallback(`Collect file... (${completedTasks}/${totalTasks}) ${pc.dim(filePath)}`);
    logger.trace(`Collect files... (${completedTasks}/${totalTasks}) ${filePath}`);

    let rawFile: RawFile | undefined;
    if (result.content !== null) {
      rawFile = { path: filePath, content: result.content };
      options.onFileCollected?.(rawFile);
    }

    return { filePath, result, rawFile };
  });

  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];

  for (const { filePath, result, rawFile } of results) {
    if (rawFile) {
      rawFiles.push(rawFile);
    } else if (result.skippedReason) {
      skippedFiles.push({ path: filePath, reason: result.skippedReason });
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

  return { rawFiles, skippedFiles };
};
