import path from 'node:path';
import pc from 'picocolors';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import {
  type BinaryDetectors,
  readRawFile as defaultReadRawFile,
  readRawFileCached as defaultReadRawFileCached,
  type FileReadResult,
  type FileSkipReason,
  populateFileContentCache,
  probeFileCache,
  readRawFileSync,
  resolveBinaryDetectors,
} from './fileRead.js';
import type { RawFile } from './fileTypes.js';

// Concurrency limit for parallel file reads on the main thread.
// 128 balances SSD parallelism with libuv threadpool contention from worker threads.
// On cold CLI runs, worker threads (security + metrics) are simultaneously loading heavy
// modules (@secretlint/core, gpt-tokenizer) via the same libuv threadpool. 512 pending
// file reads flood the threadpool queue, starving worker module loading and increasing
// overall latency by ~40ms. 128 provides sufficient read-ahead for modern SSDs (32 pending
// per libuv thread) while leaving headroom for concurrent worker I/O.
// On warm runs (MCP/server), workers are cached and don't compete, so 128 vs 512 is neutral.
const FILE_COLLECT_CONCURRENCY = 128;

export interface SkippedFileInfo {
  path: string;
  reason: FileSkipReason;
}

export interface FileCollectResults {
  rawFiles: RawFile[];
  skippedFiles: SkippedFileInfo[];
  /**
   * Lazy cache population callback. Call this AFTER the pack() pipeline completes
   * to populate the file content cache for subsequent calls. Returns a promise
   * that resolves when all file stats are collected and cached.
   * Not called for CLI single-run (no overhead); called for MCP/server.
   */
  pendingCachePopulation?: () => Promise<void>;
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
    readRawFileCached: defaultReadRawFileCached,
  },
): Promise<FileCollectResults> => {
  const startTime = process.hrtime.bigint();
  logger.trace(`Starting file collection for ${filePaths.length} files`);

  // Pre-resolve binary detection functions once before the file read loop.
  // Eliminates ~2000 microtask yields from per-file `await getIsBinaryPath()`
  // and `await getIsBinaryFileSync()` calls when these are already cached.
  const binaryDetectors: BinaryDetectors = await resolveBinaryDetectors();

  const totalTasks = filePaths.length;
  const maxFileSize = config.input.maxFileSize;

  const rawFiles: RawFile[] = [];
  const skippedFiles: SkippedFileInfo[] = [];
  const cacheEntries: { fullPath: string; result: FileReadResult }[] = [];

  // ── Sync fast-path: probe cache for all files without async overhead ───
  // On warm MCP/server runs, 95-100% of files hit the content cache. Using a
  // plain for loop with synchronous probeFileCache() avoids creating ~1000
  // async function frames, Promises, and microtask resolutions that the async
  // promisePool generates even for purely synchronous cache-hit returns.
  // Benchmarked: sync loop completes in ~5ms vs ~30ms for async pool (1000 files).
  const cacheMisses: { index: number; filePath: string; fullPath: string }[] = [];

  for (let i = 0; i < totalTasks; i++) {
    const filePath = filePaths[i];
    const fullPath = path.join(rootDir, filePath);
    const result = probeFileCache(fullPath, maxFileSize, binaryDetectors);

    if (result !== null) {
      // Cache hit — process synchronously
      if (result.content !== null) {
        rawFiles.push({ path: filePath, content: result.content });
      } else if (result.skippedReason) {
        skippedFiles.push({ path: filePath, reason: result.skippedReason });
      }
      cacheEntries.push({ fullPath, result });
    } else {
      cacheMisses.push({ index: i, filePath, fullPath });
    }

    // Throttle progress callbacks to every 50 files
    if ((i + 1) % 50 === 0 || i === totalTasks - 1) {
      progressCallback(`Collect file... (${i + 1}/${totalTasks}) ${pc.dim(filePath)}`);
    }
    logger.trace(`Collect files... (${i + 1}/${totalTasks}) ${filePath}`);
  }

  // ── Read cache-missed files ────────────────────────────────────────────
  // Use sync reads when default deps are in use (production path).
  // readFileSync avoids ~1000 Promise allocations, libuv threadpool scheduling,
  // and microtask overhead. Benchmarked: readFileSync loop completes in ~16ms
  // for 1000 files vs ~120ms with async promisePool(128) — an 8x improvement.
  // Non-UTF-8 files (~1%) fall back to async readRawFile with jschardet detection.
  // When custom deps are provided (test mocks), use the async path to respect mocks.
  const useDefaultDeps = deps.readRawFile === defaultReadRawFile;

  if (cacheMisses.length > 0) {
    logger.trace(`File cache: ${totalTasks - cacheMisses.length} hits, ${cacheMisses.length} misses`);

    if (useDefaultDeps) {
      // ── Sync fast-read path ───────────────────────────────────────────
      const asyncFallback: { filePath: string; fullPath: string }[] = [];

      for (const { filePath, fullPath } of cacheMisses) {
        const result = readRawFileSync(fullPath, maxFileSize, binaryDetectors);

        if (result === 'needs-async') {
          // Non-UTF-8 file — defer to async path with encoding detection
          asyncFallback.push({ filePath, fullPath });
          continue;
        }

        if (result.content !== null) {
          rawFiles.push({ path: filePath, content: result.content });
        } else if (result.skippedReason) {
          skippedFiles.push({ path: filePath, reason: result.skippedReason });
        }
        cacheEntries.push({ fullPath, result });
        logger.trace(`Collect files... (read) ${filePath}`);
      }

      // Async fallback for non-UTF-8 files (~1% of source files).
      // These need jschardet + iconv-lite for encoding detection, which are lazily loaded.
      if (asyncFallback.length > 0) {
        logger.trace(`Async fallback for ${asyncFallback.length} non-UTF-8 files`);
        const fallbackResults = await promisePool(
          asyncFallback,
          FILE_COLLECT_CONCURRENCY,
          async ({ filePath, fullPath }) => {
            const result = await deps.readRawFile(fullPath, maxFileSize, binaryDetectors);
            return { filePath, fullPath, result };
          },
        );

        for (const { filePath, fullPath, result } of fallbackResults) {
          if (result.content !== null) {
            rawFiles.push({ path: filePath, content: result.content });
          } else if (result.skippedReason) {
            skippedFiles.push({ path: filePath, reason: result.skippedReason });
          }
          cacheEntries.push({ fullPath, result });
        }
      }
    } else {
      // ── Async path (test mocks or custom deps) ────────────────────────
      const missResults = await promisePool(cacheMisses, FILE_COLLECT_CONCURRENCY, async ({ filePath, fullPath }) => {
        const result = await deps.readRawFile(fullPath, maxFileSize, binaryDetectors);
        logger.trace(`Collect files... (read) ${filePath}`);
        return { filePath, fullPath, result };
      });

      for (const { filePath, fullPath, result } of missResults) {
        if (result.content !== null) {
          rawFiles.push({ path: filePath, content: result.content });
        } else if (result.skippedReason) {
          skippedFiles.push({ path: filePath, reason: result.skippedReason });
        }
        cacheEntries.push({ fullPath, result });
      }
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`File collection completed in ${duration.toFixed(2)}ms`);

  // Return cache entries as a lazy population callback. The caller (packager) invokes
  // this AFTER the pack() pipeline completes, so stat calls don't start during critical I/O.
  // For CLI single-run, this is never invoked (no overhead, process exits immediately).
  // For MCP/server, it's invoked after pack() returns to prepare the cache for the next call.
  const pendingCachePopulation = () => populateFileContentCache(cacheEntries);

  return { rawFiles, skippedFiles, pendingCachePopulation };
};
