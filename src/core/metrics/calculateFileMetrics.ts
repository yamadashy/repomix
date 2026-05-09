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

    // Resolve cache hits synchronously before dispatching to workers.
    // Each MD5 computation (~0.01ms per file) is far cheaper than a worker
    // round-trip, so this check adds negligible cost on a cold cache and
    // eliminates the ~600ms metrics phase on a warm one.
    const cachedResults: FileMetrics[] = [];
    const uncachedFiles: ProcessedFile[] = [];

    for (const file of filesToProcess) {
      const key = contentCacheKey(tokenCounterEncoding, file.content);
      const cached = getCached(key);
      if (cached !== undefined) {
        cachedResults.push({ path: file.path, charCount: file.content.length, tokenCount: cached });
      } else {
        uncachedFiles.push(file);
      }
    }

    const cacheHits = cachedResults.length;
    const cacheMisses = uncachedFiles.length;
    logger.trace(`Token count cache: ${cacheHits} hits, ${cacheMisses} misses`);

    if (cacheMisses === 0) {
      // All files were in cache — reconstruct results in original order
      const resultMap = new Map(cachedResults.map((r) => [r.path, r]));
      const allResults = filesToProcess.map((file) => resultMap.get(file.path) as FileMetrics);
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms (all from cache)`);
      progressCallback(`Calculating metrics... (${allResults.length}/${filesToProcess.length})`);
      return allResults;
    }

    // Split uncached files into batches for worker dispatch
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < uncachedFiles.length; i += METRICS_BATCH_SIZE) {
      batches.push(uncachedFiles.slice(i, i + METRICS_BATCH_SIZE));
    }

    logger.trace(`Split ${uncachedFiles.length} uncached files into ${batches.length} batches for token counting`);

    let completedItems = cacheHits;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const tokenCounts = await runBatchTokenCount(deps.taskRunner, {
          items: batch.map((file) => ({ content: file.content, path: file.path })),
          encoding: tokenCounterEncoding,
        });

        const results: FileMetrics[] = batch.map((file, index) => {
          const tokenCount = tokenCounts[index];
          // Store result in cache for future runs
          setCached(contentCacheKey(tokenCounterEncoding, file.content), tokenCount);
          return { path: file.path, charCount: file.content.length, tokenCount };
        });

        completedItems += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(
          `Calculating metrics... (${completedItems}/${filesToProcess.length}) ${pc.dim(lastFile.path)}`,
        );
        logger.trace(`Calculating metrics... (${completedItems}/${filesToProcess.length}) ${lastFile.path}`);

        return results;
      }),
    );

    // Merge uncached results back with cached ones in original file order.
    // Build a map from path → result for O(1) lookup, handling rare duplicate
    // paths by accepting the first occurrence (same as cached map).
    const workerResultMap = new Map(batchResults.flat().map((r) => [r.path, r]));
    const cachedResultMap = new Map(cachedResults.map((r) => [r.path, r]));
    const allResults = filesToProcess.map((file) => {
      return (cachedResultMap.get(file.path) ?? workerResultMap.get(file.path)) as FileMetrics;
    });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`File metrics calculation completed in ${duration.toFixed(2)}ms`);

    return allResults;
  } catch (error) {
    logger.error('Error during file metrics calculation:', error);
    throw error;
  }
};
