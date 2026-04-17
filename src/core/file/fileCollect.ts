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

  let completed = 0;
  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      const fullPath = path.resolve(rootDir, filePath);
      const result = await deps.readRawFile(fullPath, maxFileSize);
      completed++;
      if (completed % 200 === 0 || completed === totalTasks) {
        progressCallback(`Collect file... (${completed}/${totalTasks}) ${pc.dim(filePath)}`);
      }
      return { filePath, result };
    }),
  );

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
