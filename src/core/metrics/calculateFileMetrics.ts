import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { type MetricsTaskRunner, runBatchTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';
import { contentCacheKey, getCached, setCached } from './tokenCountCache.js';
import type { FileMetrics } from './workers/types.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread; measured minimum
// batch durations are ~2ms, dominated by tinypool serialization and dispatch.
// At ~1000 files on a 4-core host (~20 batches, ~5 per thread), this cuts the
// estimated per-thread IPC overhead from ~50ms (batch=10) to ~10ms while
// keeping load balance comparable. Larger batches (e.g. 100) hurt because a
// single oversized batch can monopolize a worker and stretch the critical path.
const METRICS_BATCH_SIZE = 50;

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

    // Resolve cache hits before dispatching to workers. MD5 hashing each file
    // costs ~0.01 ms, far less than a worker round-trip. The key computed here
    // is carried forward to the miss path so we never hash the same content
    // twice.
    //
    // Results are assembled by *index* into filesToProcess, not by path —
    // multi-root packs can include the same relative path from different roots
    // and a path-keyed merge would collapse duplicates into one metric.
    type UncachedEntry = { file: ProcessedFile; key: string; index: number };
    const allResults: FileMetrics[] = Array.from({ length: filesToProcess.length });
    const uncachedFiles: UncachedEntry[] = [];

    const encodingPrefix = `${tokenCounterEncoding}:`;
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      // Reuse the key precomputed during the security-check window when it is for
      // the active encoding; otherwise hash the content here as before. The prefix
      // check guards against a stale key from a different encoding (the digest is
      // content-only, so a mismatched prefix could otherwise alias another
      // encoding's cached count).
      const precomputed = file.tokenCacheKey;
      const key = precomputed?.startsWith(encodingPrefix)
        ? precomputed
        : contentCacheKey(tokenCounterEncoding, file.content);
      const cached = getCached(key);
      if (cached !== undefined) {
        allResults[i] = { path: file.path, charCount: file.content.length, tokenCount: cached };
      } else {
        uncachedFiles.push({ file, key, index: i });
      }
    }

    const cacheHits = filesToProcess.length - uncachedFiles.length;
    const cacheMisses = uncachedFiles.length;
    logger.trace(`Token count cache: ${cacheHits} hits, ${cacheMisses} misses`);

    if (cacheMisses === 0) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms (all from cache)`);
      progressCallback(`Calculating metrics... (${allResults.length}/${filesToProcess.length})`);
      return allResults;
    }

    // Split uncached files into batches to reduce IPC round-trips
    const batches: UncachedEntry[][] = [];
    for (let i = 0; i < uncachedFiles.length; i += METRICS_BATCH_SIZE) {
      batches.push(uncachedFiles.slice(i, i + METRICS_BATCH_SIZE));
    }

    logger.trace(`Split ${uncachedFiles.length} uncached files into ${batches.length} batches for token counting`);

    let completedItems = cacheHits;

    await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await runBatchTokenCount(deps.taskRunner, {
          items: batch.map(({ file }) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        });

        batch.forEach(({ file, key, index }, i) => {
          const tokenCount = tokenCounts[i];
          // Reuse the key computed during miss-detection to avoid re-hashing.
          setCached(key, tokenCount);
          allResults[index] = { path: file.path, charCount: file.content.length, tokenCount };
        });

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1].file;
        progressCallback(
          `Calculating metrics... (${completedItems}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedItems}/${filesToProcess.length}) ${lastFile.path}`);
      }),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during file metrics calculation:', error);
    throw error;
  }
};
