import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import {
  type BinaryDetectors,
  readRawFile as defaultReadRawFile,
  type FileSkipReason,
  resolveBinaryDetectors,
} from './fileRead.js';
import type { RawFile } from './fileTypes.js';

// Concurrency limit for parallel file reads on the main thread.
// 512 saturates the libuv threadpool (4 threads by default) and kernel I/O scheduler
// with enough pending requests to maximize readahead and SSD parallelism.
// Node.js uses epoll/kqueue so 512 pending fds is well within OS limits (default 1024+).
const FILE_COLLECT_CONCURRENCY = 512;

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
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
  deps = {
    readRawFile: defaultReadRawFile,
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  // Pre-resolve binary detection functions once before the file read loop.
  // Eliminates ~2000 microtask yields from per-file `await getIsBinaryPath()`
  // and `await getIsBinaryFileSync()` calls when these are already cached.
  const binaryDetectors: BinaryDetectors = await resolveBinaryDetectors();

  let completedTasks = 0;
  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  const results = await promisePool(filePaths, FILE_COLLECT_CONCURRENCY, async (filePath) => {
    const fullPath = path.join(rootDir, filePath);
    const result = await deps.readRawFile(fullPath, maxFileSize, binaryDetectors);

    completedTasks++;
    // Throttle progress callbacks to every 50 files to reduce string allocation overhead
    if (completedTasks % 50 === 0 || completedTasks === totalTasks) {
      progressCallback(`Collect file... (${completedTasks}/${totalTasks}) ${pc.dim(filePath)}`);
    }
    logger.trace(`Collect files... (${completedTasks}/${totalTasks}) ${filePath}`);

    return { filePath, result };
  });

  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];

  for (const { filePath, result } of results) {
    if (result.content !== null) {
      rawFiles.push({ path: filePath, content: result.content });
    } else if (result.skippedReason) {
      skippedFiles.push({ path: filePath, reason: result.skippedReason });
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

  return { rawFiles, skippedFiles };
};
