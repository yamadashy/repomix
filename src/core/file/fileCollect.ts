import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import {
  readRawFile as defaultReadRawFile,
  readRawFileSync as defaultReadRawFileSync,
  type FileSkipReason,
} from './fileRead.js';
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
    readRawFile: defaultReadRawFile,
    readRawFileSync: defaultReadRawFileSync,
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  // Pre-allocate results indexed by position to preserve original file order,
  // even when some files need async retry for encoding detection.
  const results: ({ type: 'raw'; file: RawFile } | { type: 'skipped'; info: SkippedFileInfo } | null)[] = Array.from(
    { length: filePaths.length },
    () => null,
  );

  // Use synchronous reads to avoid libuv thread pool bottleneck.
  // Sync reads are ~2-3x faster for the typical workload (hundreds to thousands of
  // mostly small source files) because they skip per-file event loop scheduling and
  // libuv thread pool round-trips. The main thread is not doing other useful work
  // during file collection, so blocking it is acceptable.
  // Falls back to async for files that fail sync decoding (non-UTF-8 encodings).
  const asyncRetryFiles: { filePath: string; fullPath: string; index: number }[] = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fullPath = path.resolve(rootDir, filePath);
    const result = deps.readRawFileSync(fullPath, maxFileSize);

    if (result.skippedReason === 'needs-async-encoding') {
      // Non-UTF-8 file: needs async path with jschardet/iconv-lite
      asyncRetryFiles.push({ filePath, fullPath, index: i });
    } else if (result.content !== null) {
      results[i] = { type: 'raw', file: { path: filePath, content: result.content } };
    } else if (result.skippedReason) {
      results[i] = { type: 'skipped', info: { path: filePath, reason: result.skippedReason } };
    }

    progressCallback(`Collect file... (${i + 1}/${totalTasks}) ${pc.dim(filePath)}`);
    logger.trace(`Collect files... (${i + 1}/${totalTasks}) ${filePath}`);
  }

  // Retry non-UTF-8 files with async path (uses jschardet for encoding detection).
  // Results are inserted at their original index to preserve file order.
  if (asyncRetryFiles.length > 0) {
    logger.trace(`Retrying ${asyncRetryFiles.length} files with async encoding detection`);
    for (const { filePath, fullPath, index } of asyncRetryFiles) {
      const result = await deps.readRawFile(fullPath, maxFileSize);
      if (result.content !== null) {
        results[index] = { type: 'raw', file: { path: filePath, content: result.content } };
      } else if (result.skippedReason) {
        results[index] = { type: 'skipped', info: { path: filePath, reason: result.skippedReason } };
      }
      progressCallback(`Collect file (encoding retry)... ${pc.dim(filePath)}`);
    }
  }

  // Flatten results preserving original order
  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];
  for (const entry of results) {
    if (entry?.type === 'raw') rawFiles.push(entry.file);
    else if (entry?.type === 'skipped') skippedFiles.push(entry.info);
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

  return { rawFiles, skippedFiles };
};
