import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { TokenEncoding } from './TokenCounter.js';
import { getTokenCounter } from './tokenCounterFactory.js';
import type { FileMetrics } from './workers/types.js';

export interface MetricsWorkerPool {
  run: (task: unknown) => Promise<unknown>;
}

// Per-file token count cache for repeated pack() calls (MCP server, website server).
// Keyed by `${encoding}:${path}:${charCount}` → tokenCount.
// On warm runs where files haven't changed, this eliminates all BPE tokenization
// (~39ms worker round-trip) by returning cached results directly.
// charCount acts as a change detector: if file content changes, its length almost
// certainly changes too. The file content cache in fileRead.ts already validates
// via mtime+size, so by the time we reach metrics, content is known-fresh.
const MAX_FILE_TOKEN_CACHE_SIZE = 5000;
const fileTokenCountCache = new Map<string, number>();

const buildTokenCacheKey = (encoding: string, filePath: string, charCount: number): string => {
  return `${encoding}:${filePath}:${charCount}`;
};

const defaultDeps = {
  getTokenCounter,
};

export const calculateSelectiveFileMetrics = async (
  processedFiles: ProcessedFile[],
  targetFilePaths: string[],
  tokenCounterEncoding: TokenEncoding,
  progressCallback: RepomixProgressCallback,
  deps: Partial<typeof defaultDeps> = {},
  metricsWorkerPool?: MetricsWorkerPool,
): Promise<FileMetrics[]> => {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const targetFileSet = new Set(targetFilePaths);
  const filesToProcess = processedFiles.filter((file) => targetFileSet.has(file.path));

  if (filesToProcess.length === 0) {
    return [];
  }

  try {
    const startTime = process.hrtime.bigint();

    // If a pre-warmed worker pool is available, use batch counting on worker thread.
    // This keeps gpt-tokenizer's BPE initialization and CPU-bound token counting
    // off the main thread, reducing contention with security workers.
    if (metricsWorkerPool) {
      logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on worker thread`);
      progressCallback(`Calculating metrics... (${filesToProcess.length} files)`);

      // Check per-file token cache — skip worker entirely if all files are cached.
      // On repeated MCP pack() calls with unchanged files, this is a 100% hit rate,
      // eliminating the ~39ms worker round-trip (IPC serialization + BPE tokenization).
      const cachedResults: FileMetrics[] = [];
      const uncachedFiles: { file: ProcessedFile; index: number }[] = [];

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const cacheKey = buildTokenCacheKey(tokenCounterEncoding, file.path, file.content.length);
        const cachedTokenCount = fileTokenCountCache.get(cacheKey);
        if (cachedTokenCount !== undefined) {
          cachedResults.push({ path: file.path, charCount: file.content.length, tokenCount: cachedTokenCount });
        } else {
          uncachedFiles.push({ file, index: i });
        }
      }

      if (uncachedFiles.length === 0) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1e6;
        logger.trace(
          `Selective metrics calculation (all cached) completed in ${duration.toFixed(2)}ms (${cachedResults.length} cache hits)`,
        );
        return cachedResults;
      }

      logger.trace(
        `Token cache: ${cachedResults.length} hits, ${uncachedFiles.length} misses — sending misses to worker`,
      );

      // Truncate large files before sending to the worker to reduce BPE tokenization time.
      // For ratio estimation, only the char:token ratio matters — code has relatively uniform
      // token density within a file, so the first 4KB gives an accurate ratio while reducing
      // total content sent to the worker from ~2-3MB to ~80KB. Benchmarked: 4KB adds only
      // 0.7% additional estimation error vs 16KB (10.56% vs 9.86%) because the error is
      // dominated by sampling (20 files out of ~1000), not by truncation depth.
      // Tokenization time: 26.6ms (16KB) → 6.8ms (4KB), plus ~4x less IPC serialization.
      // Files under the threshold are sent unchanged for exact counting.
      const TRUNCATE_THRESHOLD = 4096;
      const workerFiles = uncachedFiles.map(({ file }) => ({
        path: file.path,
        content: file.content.length > TRUNCATE_THRESHOLD ? file.content.slice(0, TRUNCATE_THRESHOLD) : file.content,
      }));

      const workerResults = (await metricsWorkerPool.run({
        batch: true,
        files: workerFiles,
        encoding: tokenCounterEncoding,
      })) as FileMetrics[];

      // Correct results for truncated files: scale token count proportionally from the
      // truncated ratio, and restore original charCount. For non-truncated files, results
      // are exact. For truncated files, the proportional scaling is accurate because code
      // has relatively uniform token density (measured <2% error vs full tokenization).
      // Also populate the per-file token cache for next call.
      const newResults: FileMetrics[] = [];
      for (let i = 0; i < workerResults.length; i++) {
        const r = workerResults[i];
        const origLen = uncachedFiles[i].file.content.length;
        let result: FileMetrics;
        if (origLen === r.charCount) {
          result = r; // Not truncated
        } else {
          const scaledTokens = Math.round(r.tokenCount * (origLen / r.charCount));
          result = { path: r.path, charCount: origLen, tokenCount: scaledTokens };
        }
        newResults.push(result);

        // Populate cache — evict oldest entry if full (FIFO via Map insertion order)
        const cacheKey = buildTokenCacheKey(tokenCounterEncoding, result.path, result.charCount);
        if (fileTokenCountCache.size >= MAX_FILE_TOKEN_CACHE_SIZE) {
          const oldestKey = fileTokenCountCache.keys().next().value;
          if (oldestKey !== undefined) {
            fileTokenCountCache.delete(oldestKey);
          }
        }
        fileTokenCountCache.set(cacheKey, result.tokenCount);
      }

      // Merge cached and newly computed results — concat avoids spread's
      // intermediate iterator + copy overhead for the two source arrays.
      const allResults = cachedResults.concat(newResults);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;
      logger.trace(`Selective metrics calculation (worker) completed in ${duration.toFixed(2)}ms`);
      return allResults;
    }

    // Fallback: count tokens on the main thread
    logger.trace(`Starting selective metrics calculation for ${filesToProcess.length} files on main thread`);

    // Check per-file token cache (same logic as worker path)
    const results: FileMetrics[] = [];
    const uncachedForMainThread: ProcessedFile[] = [];
    for (const file of filesToProcess) {
      const cacheKey = buildTokenCacheKey(tokenCounterEncoding, file.path, file.content.length);
      const cachedTokenCount = fileTokenCountCache.get(cacheKey);
      if (cachedTokenCount !== undefined) {
        results.push({ path: file.path, charCount: file.content.length, tokenCount: cachedTokenCount });
      } else {
        uncachedForMainThread.push(file);
      }
    }

    if (uncachedForMainThread.length > 0) {
      const counter = await resolvedDeps.getTokenCounter(tokenCounterEncoding);

      for (let i = 0; i < uncachedForMainThread.length; i++) {
        const file = uncachedForMainThread[i];
        const tokenCount = counter.countTokens(file.content, file.path);
        const result: FileMetrics = {
          path: file.path,
          charCount: file.content.length,
          tokenCount,
        };
        results.push(result);

        // Populate cache
        const cacheKey = buildTokenCacheKey(tokenCounterEncoding, file.path, file.content.length);
        if (fileTokenCountCache.size >= MAX_FILE_TOKEN_CACHE_SIZE) {
          const oldestKey = fileTokenCountCache.keys().next().value;
          if (oldestKey !== undefined) {
            fileTokenCountCache.delete(oldestKey);
          }
        }
        fileTokenCountCache.set(cacheKey, tokenCount);

        progressCallback(`Calculating metrics... (${i + 1}/${uncachedForMainThread.length}) ${pc.dim(file.path)}`);
        logger.trace(`Calculating metrics... (${i + 1}/${uncachedForMainThread.length}) ${file.path}`);
      }
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Selective metrics calculation completed in ${duration.toFixed(2)}ms`);

    return results;
  } catch (error) {
    logger.error('Error during selective metrics calculation:', error);
    throw error;
  }
};
