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

// Default batch size for the optional `onBatch` streaming callback. Matches
// the security-check worker batch size so caller-side re-batching is unnecessary.
const DEFAULT_STREAM_BATCH_SIZE = 50;

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
}

export interface CollectFilesOptions {
  /**
   * Fires synchronously each time `streamBatchSize` raw files have been read,
   * letting downstream consumers (e.g. the security check) start work while
   * collection is still in flight. The callback runs on the main event-loop
   * tick that completed the file read; do not `await` long-running work
   * inside it — return quickly (e.g. dispatch to a worker pool and stash the
   * promise for later) so the read pool keeps draining.
   * The final partial batch (if any) is delivered after all reads complete.
   */
  onBatch?: (batch: RawFile[]) => void;
  /** Defaults to {@link DEFAULT_STREAM_BATCH_SIZE} (50). */
  streamBatchSize?: number;
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

  // Streaming-batch state: keep a pending bucket of successfully-read files and
  // hand it off to `onBatch` whenever it reaches the configured size. This lets
  // the security check overlap with the rest of file I/O instead of running
  // strictly afterwards. `pendingBatch` is shared across the up-to-50 concurrent
  // promisePool coroutines, but the push + length check + swap below is a
  // synchronous sequence between two `await` points (`readRawFile` above and
  // the implicit yield on the next loop iteration), so JavaScript's
  // single-threaded execution guarantees no other coroutine observes the
  // intermediate state.
  const onBatch = options.onBatch;
  const streamBatchSize = options.streamBatchSize ?? DEFAULT_STREAM_BATCH_SIZE;
  let pendingBatch: RawFile[] = [];

  const results = await promisePool(filePaths, FILE_COLLECT_CONCURRENCY, async (filePath) => {
    const fullPath = path.resolve(rootDir, filePath);
    const result = await deps.readRawFile(fullPath, maxFileSize);

    completedTasks++;
    progressCallback(`Collect file... (${completedTasks}/${totalTasks}) ${pc.dim(filePath)}`);
    logger.trace(`Collect files... (${completedTasks}/${totalTasks}) ${filePath}`);

    if (onBatch !== undefined && result.content !== null) {
      pendingBatch.push({ path: filePath, content: result.content });
      if (pendingBatch.length >= streamBatchSize) {
        const flushed = pendingBatch;
        pendingBatch = [];
        onBatch(flushed);
      }
    }

    return { filePath, result };
  });

  // Flush the final partial batch — collectFiles guarantees onBatch has seen
  // every successfully-read file before returning.
  if (onBatch !== undefined && pendingBatch.length > 0) {
    const flushed = pendingBatch;
    pendingBatch = [];
    onBatch(flushed);
  }

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
