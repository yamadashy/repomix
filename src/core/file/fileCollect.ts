import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { readRawFileSync as defaultReadRawFileSync, type FileReadResult, type FileSkipReason } from './fileRead.js';
import type { RawFile } from './fileTypes.js';

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
}

export const collectFiles = async (
  filePaths: string[],
  rootDir: string,
  config: RepomixConfigMerged,
  progressCallback: RepomixProgressCallback = () => {},
  deps = {
    readRawFile: defaultReadRawFileSync as (filePath: string, maxFileSize: number) => FileReadResult,
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];

  // Use synchronous reads to avoid Promise/libuv-threadpool overhead.
  // With ~1000 small source files, readFileSync via VFS page cache is significantly
  // faster than async readFile which creates a Promise per file and contends on
  // libuv's 4-thread pool.
  for (let i = 0; i < totalTasks; i++) {
    const filePath = filePaths[i];
    const fullPath = path.resolve(rootDir, filePath);
    const result = deps.readRawFile(fullPath, maxFileSize);

    if (result.content !== null) {
      rawFiles.push({ path: filePath, content: result.content });
    } else if (result.skippedReason) {
      skippedFiles.push({ path: filePath, reason: result.skippedReason });
    }

    if ((i + 1) % 100 === 0 || i === totalTasks - 1) {
      progressCallback(`Collect file... (${i + 1}/${totalTasks}) ${pc.dim(filePath)}`);
    }
    logger.trace(`Collect files... (${i + 1}/${totalTasks}) ${filePath}`);
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

  return { rawFiles, skippedFiles };
};
