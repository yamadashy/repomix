import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { type MetricsTaskRunner, runBatchTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

// Worker compute time per batch is roughly proportional to total content bytes
// in the batch, not the file count. Fixed file-count batches starve workers near
// the tail because batches dominated by a few large files take much longer than
// batches of small files; the slowest batch sets the makespan.
//
// Bin-pack files into batches by total bytes (adaptive target — see
// `pickBatchByteTarget`) so each batch takes roughly equal worker time, then
// dispatch the largest batches first. Tinypool's FIFO queue serves the earliest-
// enqueued tasks first, which approximates LPT (longest-processing-time-first)
// scheduling across the worker pool and minimises the tail batch.
//
// Why an adaptive target instead of a fixed 256 KiB:
// - Small repos (e.g. ~250 files, ~1 MB total) at a fixed 256 KiB target produce
//   only ~4 batches, leaving workers idle for the last round. Adaptive sizing
//   keeps ~3× workers' worth of batches even on small inputs.
// - Large repos at the same fixed target produce ~15 batches with much better
//   byte-balance than the previous fixed-count batching.
const METRICS_BATCH_BYTES_MIN = 16 * 1024; // floor — avoid IPC dominating per-batch cost
const METRICS_BATCH_BYTES_MAX = 256 * 1024; // ceiling — bound worst-case clone payload
// Mirror of METRICS_PREWARM_THREAD_CAP in calculateMetrics.ts. Kept duplicated to
// avoid a circular import (calculateMetrics already imports from this module).
// Drift only changes the batch count by a small factor — pool of 6 would emit
// ~18 batches instead of 9 — and never affects correctness.
const METRICS_ASSUMED_WORKERS = 3;
// Aim for this many batches per worker so the last round of work is well-balanced
// across all workers (with FIFO LPT, the tail is the longest single batch).
const METRICS_BATCHES_PER_WORKER = 3;
// Per-batch file-count cap — guards against pathological inputs (a directory of
// thousands of empty files would otherwise pack into a single oversized batch).
const METRICS_BATCH_FILES_CAP = 200;

const pickBatchByteTarget = (totalBytes: number): number => {
  const target = Math.ceil(totalBytes / (METRICS_ASSUMED_WORKERS * METRICS_BATCHES_PER_WORKER));
  return Math.min(METRICS_BATCH_BYTES_MAX, Math.max(METRICS_BATCH_BYTES_MIN, target));
};

interface SizedBatch {
  files: ProcessedFile[];
  bytes: number;
}

/**
 * Bin-pack files into batches whose total content size targets `bytesTarget`,
 * then sort batches largest-first so dispatch order matches LPT scheduling
 * through Tinypool's FIFO queue. Files larger than the target form their own
 * batch. `filesCap` bounds batches against pathological many-tiny-file inputs.
 *
 * Batch order does not need to match input order: downstream consumers index
 * `FileMetrics` by `path`, not array position.
 */
export const packBatchesByBytes = (
  files: ProcessedFile[],
  bytesTarget: number,
  filesCap: number,
): ProcessedFile[][] => {
  const batches: SizedBatch[] = [];
  let current: SizedBatch = { files: [], bytes: 0 };

  for (const file of files) {
    const len = file.content.length;
    // The `current.files.length > 0` guard lets a single oversized file start
    // its own batch without flushing an empty accumulator.
    if (current.files.length > 0 && (current.bytes + len > bytesTarget || current.files.length >= filesCap)) {
      batches.push(current);
      current = { files: [], bytes: 0 };
    }
    current.files.push(file);
    current.bytes += len;
  }
  if (current.files.length > 0) {
    batches.push(current);
  }

  batches.sort((a, b) => b.bytes - a.bytes);
  return batches.map((b) => b.files);
};

export const calculateFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: { taskRunner: MetricsTaskRunner },
): Promise<FileMetrics[]> => {
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace(`Starting file metrics calculation for ${filesToProcess.length} files using worker pool`);

    // Bin-pack files into byte-balanced batches and order them largest-first so
    // Tinypool's FIFO queue starts the slowest batches first across all workers.
    const totalBytes = filesToProcess.reduce((sum, f) => sum + f.content.length, 0);
    const bytesTarget = pickBatchByteTarget(totalBytes);
    const batches = packBatchesByBytes(filesToProcess, bytesTarget, METRICS_BATCH_FILES_CAP);

    logger.trace(`Split ${filesToProcess.length} files into ${batches.length} batches for token counting`);

    let completedItems = 0;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await runBatchTokenCount(deps.taskRunner, {
          items: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        });

        const results: FileMetrics[] = batch.map((file, index) => ({
          path: file.path,
          charCount: file.content.length,
          tokenCount: tokenCounts[index],
        }));

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedItems}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedItems}/${filesToProcess.length}) ${lastFile.path}`);

        return results;
      }),
    );

    const allResults = batchResults.flat();

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during file metrics calculation:', error);
    throw error;
  }
};
