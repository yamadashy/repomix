import path from 'node:path';
import { setLogLevelByWorkerData } from '../../../shared/logger.js';
import { type FileSkipReason, readRawFile } from '../fileRead.js';
import type { RawFile } from '../fileTypes.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface FileCollectTask {
  filePath: string;
  rootDir: string;
  maxFileSize: number;
}

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResult {
  rawFile?: RawFile;
  skippedFile?: SkippedFileInfo;
}

export default async ({ filePath, rootDir, maxFileSize }: FileCollectTask): Promise<FileCollectResult> => {
  const fullPath = path.resolve(rootDir, filePath);
  const result = await readRawFile(fullPath, maxFileSize);

  if (result.content !== null) {
    return {
      rawFile: {
        path: filePath,
        content: result.content,
      },
    };
  }

  if (result.skippedReason) {
    return {
      skippedFile: {
        path: filePath,
        reason: result.skippedReason,
      },
    };
  }

  throw new Error(
    `File processing for ${filePath} resulted in an unexpected state: content is null but no skip reason was provided.`,
  );
};

// Export cleanup function for Tinypool teardown (no cleanup needed for this worker)
export const onWorkerTermination = async (): Promise<void> => {
  // No cleanup needed for file collection worker
};
