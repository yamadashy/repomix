import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import { readRawFile as defaultReadRawFile, type FileSkipReason } from './fileRead.js';
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
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];

  // Use a simple sequential loop. readRawFile uses synchronous I/O (readFileSync)
  // which is ~9× faster than async readFile for many small files because it
  // eliminates per-file Promise/event-loop overhead. The sync approach also avoids
  // CPU contention between the event loop and worker-thread warm-up, which
  // otherwise inflates collection time by ~100ms.
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
      logger.trace(`Collect files... (${i + 1}/${totalTasks}) ${filePath}`);
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

  return { rawFiles, skippedFiles };
};
