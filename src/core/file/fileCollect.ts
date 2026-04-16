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
  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];

  // Phase 1: Synchronous fast path for UTF-8 files (~99% of source code).
  // readFileSync bypasses per-file Promise allocation, libuv thread pool
  // scheduling, and microtask overhead. For ~1000 files from the OS page
  // cache this reduces collection from ~150ms (async pool) to ~30ms.
  // Files that fail UTF-8 decoding (~1%) are collected for async fallback.
  const asyncFallbackPaths: string[] = [];

  for (let i = 0; i < totalTasks; i++) {
    const filePath = filePaths[i];
    const fullPath = path.resolve(rootDir, filePath);
    const result = deps.readRawFileSync(fullPath, maxFileSize);

    if (result === null) {
      // Not valid UTF-8 — needs async encoding detection
      asyncFallbackPaths.push(filePath);
    } else if (result.content !== null) {
      rawFiles.push({ path: filePath, content: result.content });
    } else if (result.skippedReason) {
      skippedFiles.push({ path: filePath, reason: result.skippedReason });
    }

    if ((i + 1) % 200 === 0 || i === totalTasks - 1) {
      progressCallback(`Collect file... (${i + 1}/${totalTasks}) ${pc.dim(filePath)}`);
    }
  }

  // Phase 2: Async fallback for non-UTF-8 files (typically <1% of files).
  // Uses the full readRawFile which lazy-loads jschardet + iconv-lite for
  // encoding detection (Shift-JIS, EUC-KR, etc.).
  // Process concurrently via Promise.all to maintain throughput parity with
  // the old promisePool approach for repos with many non-UTF-8 files.
  if (asyncFallbackPaths.length > 0) {
    const fallbackResults = await Promise.all(
      asyncFallbackPaths.map(async (filePath) => {
        const fullPath = path.resolve(rootDir, filePath);
        return { filePath, result: await deps.readRawFile(fullPath, maxFileSize) };
      }),
    );

    for (const { filePath, result } of fallbackResults) {
      if (result.content !== null) {
        rawFiles.push({ path: filePath, content: result.content });
      } else if (result.skippedReason) {
        skippedFiles.push({ path: filePath, reason: result.skippedReason });
      }
    }

    progressCallback(
      `Collect file... (${totalTasks}/${totalTasks}) ${pc.dim(asyncFallbackPaths[asyncFallbackPaths.length - 1])}`,
    );
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms (${asyncFallbackPaths.length} async fallbacks)`);

  return { rawFiles, skippedFiles };
};
