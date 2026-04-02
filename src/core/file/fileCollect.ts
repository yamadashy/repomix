import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import {
  readRawFile as defaultReadRawFile,
  readRawFileSync as defaultReadRawFileSync,
  type FileReadResult,
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
    readRawFileSync: defaultReadRawFileSync as
      | ((filePath: string, maxFileSize: number) => FileReadResult | null)
      | undefined,
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  // Phase 1: Synchronous reads for common UTF-8 files (~99%).
  // readFileSync('utf-8') bypasses Buffer allocation, libuv thread pool scheduling,
  // promise creation, and event loop callback overhead (~60μs per file).
  // For 1000 files this saves ~60ms compared to the async promisePool path.
  const results: (FileReadResult | null)[] = Array.from({ length: filePaths.length });
  const asyncNeededIndices: number[] = [];

  if (deps.readRawFileSync) {
    for (let i = 0; i < filePaths.length; i++) {
      const fullPath = path.resolve(rootDir, filePaths[i]);
      const result = deps.readRawFileSync(fullPath, maxFileSize);
      results[i] = result;
      if (result === null) {
        asyncNeededIndices.push(i);
      }
      progressCallback(`Collect file... (${i + 1}/${totalTasks}) ${pc.dim(filePaths[i])}`);
      logger.trace(`Collect files... (${i + 1}/${totalTasks}) ${filePaths[i]}`);
    }
  } else {
    // No sync reader available (e.g., tests providing only async mock).
    // Mark all files for async fallback.
    for (let i = 0; i < filePaths.length; i++) {
      asyncNeededIndices.push(i);
    }
  }

  // Phase 2: Async fallback for files that need encoding detection (~1% of files).
  // These are non-UTF-8 files (containing U+FFFD from lenient decoder) or files
  // that errored during sync read. The async path uses strict TextDecoder and
  // jschardet + iconv-lite for proper encoding handling.
  if (asyncNeededIndices.length > 0) {
    let asyncCompleted = 0;
    await Promise.all(
      asyncNeededIndices.map(async (idx) => {
        const filePath = filePaths[idx];
        const fullPath = path.resolve(rootDir, filePath);
        results[idx] = await deps.readRawFile(fullPath, maxFileSize);
        asyncCompleted++;
        // Only report progress if sync phase didn't already report it
        if (!deps.readRawFileSync) {
          progressCallback(`Collect file... (${asyncCompleted}/${totalTasks}) ${pc.dim(filePath)}`);
          logger.trace(`Collect files... (${asyncCompleted}/${totalTasks}) ${filePath}`);
        }
      }),
    );
  }

  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];

  for (let i = 0; i < filePaths.length; i++) {
    const result = results[i];
    if (result && result.content !== null) {
      rawFiles.push({ path: filePaths[i], content: result.content });
    } else if (result?.skippedReason) {
      skippedFiles.push({ path: filePaths[i], reason: result.skippedReason });
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms (${asyncNeededIndices.length} async fallbacks)`);

  return { rawFiles, skippedFiles };
};
