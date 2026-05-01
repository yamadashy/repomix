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

// Default batch size for streaming `onBatch` deliveries. Matches the security
// check's BATCH_SIZE so each delivered batch maps to one worker task without
// re-batching, preserving the IPC-overhead amortization the security pool was
// originally tuned for.
const DEFAULT_BATCH_SIZE = 50;

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
}

export interface CollectFilesOptions {
  // Fired with successive groups of `batchSize` (default 50) successfully
  // collected files as collection proceeds. Lets callers (e.g., the security
  // check) start work on early batches before all files finish reading,
  // overlapping CPU work with file I/O. The final partial group is flushed
  // when collection completes.
  onBatch?: (batch: RawFile[]) => void;
  batchSize?: number;
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
  options: CollectFilesOptions = {},
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  let completedTasks = 0;
  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;
  const onBatch = options.onBatch;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  let pendingBatch: RawFile[] = [];

  const flushPendingBatch = () => {
    if (onBatch && pendingBatch.length > 0) {
      const batch = pendingBatch;
      pendingBatch = [];
      onBatch(batch);
    }
  };

  const results = await promisePool(filePaths, FILE_COLLECT_CONCURRENCY, async (filePath) => {
    const fullPath = path.resolve(rootDir, filePath);
    const result = await deps.readRawFile(fullPath, maxFileSize);

    completedTasks++;
    progressCallback(`Collect file... (${completedTasks}/${totalTasks}) ${pc.dim(filePath)}`);
    logger.trace(`Collect files... (${completedTasks}/${totalTasks}) ${filePath}`);

    if (onBatch && result.content !== null) {
      pendingBatch.push({ path: filePath, content: result.content });
      if (pendingBatch.length >= batchSize) {
        flushPendingBatch();
      }
    }

    return { filePath, result };
  });

  // Emit any remaining files that didn't fill a final batch.
  flushPendingBatch();

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
