import { statSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { logger } from '../../shared/logger.js';

// ── File content cache ──────────────────────────────────────────────────────
// Module-level cache for file contents across pack() calls. When the same
// repository is packed repeatedly (MCP server, website server), most files are
// unchanged between calls. Validating via fs.stat (1 syscall, ~17ms for 1000
// files) is ~8x faster than re-reading all files (4+ syscalls, ~130ms).
//
// Cache key: absolute file path
// Cache validation: mtimeMs + size from fs.stat
// Eviction: stale entries (from previous pack() calls) evicted first when over budget
interface CachedFileEntry {
  mtimeMs: number;
  size: number;
  result: FileReadResult;
  contentBytes: number; // byte length of content (0 if skipped)
}

const fileContentCache = new Map<string, CachedFileEntry>();
let cachedTotalBytes = 0;
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200MB

// Lazy-load is-binary-path (~7ms) and isbinaryfile (~5ms) — these are only needed
// during file collection, not at worker module startup time. Deferring their import
// reduces the worker's critical module loading path by ~12ms.
let _isBinaryPath: ((filePath: string) => boolean) | undefined;
let _isBinaryFileSync: ((bytes: Buffer, size?: number) => boolean) | undefined;

const getIsBinaryPath = async (): Promise<(filePath: string) => boolean> => {
  if (!_isBinaryPath) {
    const mod = await import('is-binary-path');
    _isBinaryPath = mod.default;
  }
  return _isBinaryPath;
};

const getIsBinaryFileSync = async (): Promise<(bytes: Buffer, size?: number) => boolean> => {
  if (!_isBinaryFileSync) {
    const mod = await import('isbinaryfile');
    _isBinaryFileSync = mod.isBinaryFileSync;
  }
  return _isBinaryFileSync;
};

/**
 * Pre-warm binary detection modules (is-binary-path + isbinaryfile) by starting
 * their dynamic imports early. Call this during the file search phase so the modules
 * are cached by the time collectFiles begins reading files (~10ms saved on first file).
 */
export const preWarmBinaryDetection = (): void => {
  void getIsBinaryPath();
  void getIsBinaryFileSync();
};

// Reuse a single TextDecoder instance across all file reads.
// TextDecoder is stateless in non-streaming mode, so a shared instance is safe.
// Eliminates ~200+ constructor calls (ICU encoder initialization) during file collection.
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export type FileSkipReason = 'binary-extension' | 'binary-content' | 'size-limit' | 'encoding-error';

export interface FileReadResult {
  content: string | null;
  skippedReason?: FileSkipReason;
}

/**
 * Resolve binary detection functions once, to avoid per-file async overhead.
 * Called once in collectFiles before the file read loop starts.
 * For 1000 files, this eliminates ~2000 microtask yields from repeated
 * `await getIsBinaryPath()` / `await getIsBinaryFileSync()` calls.
 */
export const resolveBinaryDetectors = async (): Promise<{
  isBinaryPath: (filePath: string) => boolean;
  isBinaryFileSync: (bytes: Buffer, size?: number) => boolean;
}> => {
  const [isBinaryPath, isBinaryFileSync] = await Promise.all([getIsBinaryPath(), getIsBinaryFileSync()]);
  return { isBinaryPath, isBinaryFileSync };
};

export type BinaryDetectors = Awaited<ReturnType<typeof resolveBinaryDetectors>>;

/**
 * Read a file and return its text content
 * @param filePath Path to the file
 * @param maxFileSize Maximum file size in bytes
 * @param binaryDetectors Pre-resolved binary detection functions (optional, resolved per-call if not provided)
 * @returns File content as string and skip reason if file was skipped
 */
export const readRawFile = async (
  filePath: string,
  maxFileSize: number,
  binaryDetectors?: BinaryDetectors,
): Promise<FileReadResult> => {
  try {
    // Check binary extension first (no I/O needed) to skip stat + read for binary files
    const isBinaryPath = binaryDetectors?.isBinaryPath ?? (await getIsBinaryPath());
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    // Read the file directly instead of stat + readFile (saves one syscall per file).
    // For ~1000 files this eliminates ~1000 stat calls, saving ~100-150ms of I/O.
    // Handle EISDIR/ENOENT errors for non-regular files (git ls-files can include
    // entries that are locally replaced by directories).
    logger.trace(`Reading file: ${filePath}`);

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch (readError) {
      const code = (readError as NodeJS.ErrnoException).code;
      if (code === 'EISDIR') {
        logger.debug(`Skipping non-file entry: ${filePath}`);
        return { content: null, skippedReason: 'binary-content' };
      }
      throw readError;
    }

    if (buffer.length > maxFileSize) {
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    const isBinaryFileSync = binaryDetectors?.isBinaryFileSync ?? (await getIsBinaryFileSync());
    if (isBinaryFileSync(buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    // Fast path: Try UTF-8 decoding first (covers ~99% of source code files)
    // This skips the expensive jschardet.detect() which scans the entire buffer
    // through multiple encoding probers with frequency table lookups
    try {
      let content = utf8Decoder.decode(buffer);
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1); // strip UTF-8 BOM
      }
      return { content };
    } catch {
      // Not valid UTF-8, fall through to encoding detection
    }

    // Slow path: Detect encoding with jschardet for non-UTF-8 files (e.g., Shift-JIS, EUC-KR)
    // Lazy-load jschardet and iconv-lite since only ~1% of source files need encoding detection
    const jschardet = await import('jschardet');
    const iconv = await import('iconv-lite');
    const { encoding: detectedEncoding } = jschardet.default.detect(buffer) ?? {};
    const encoding = detectedEncoding && iconv.default.encodingExists(detectedEncoding) ? detectedEncoding : 'utf-8';
    const content = iconv.default.decode(buffer, encoding, { stripBOM: true });

    if (content.includes('\uFFFD')) {
      logger.debug(`Skipping file due to encoding errors (detected: ${encoding}): ${filePath}`);
      return { content: null, skippedReason: 'encoding-error' };
    }

    return { content };
  } catch (error) {
    logger.warn(`Failed to read file: ${filePath}`, error);
    return { content: null, skippedReason: 'encoding-error' };
  }
};

/**
 * Read a file with content caching across pack() calls.
 * On cache hit (same mtime + size), returns cached result via fs.stat (1 syscall)
 * instead of full readFile (4+ syscalls: open, fstat, read, close).
 * On cache miss, delegates to readRawFile without any overhead.
 *
 * For MCP/website servers that pack the same repo repeatedly, this reduces
 * collectFiles from ~130ms to ~17ms for 1000 files (stat-only validation).
 * For CLI single-run, the cache has no effect (only one call per process).
 */
export const readRawFileCached = async (
  filePath: string,
  maxFileSize: number,
  binaryDetectors?: BinaryDetectors,
): Promise<FileReadResult> => {
  // Check binary extension first (no I/O needed)
  const isBinaryPath = binaryDetectors?.isBinaryPath ?? (await getIsBinaryPath());
  if (isBinaryPath(filePath)) {
    return { content: null, skippedReason: 'binary-extension' };
  }

  // Try cache — validate with statSync (synchronous) instead of async fs.stat.
  // For ~1000 cached files, statSync takes ~2.5ms vs ~17ms for async fs.stat because
  // it avoids Promise creation/scheduling overhead and libuv threadpool contention.
  // The stat data is in the OS page cache (recently read), so the syscall itself is fast.
  // Blocking the event loop for 2.5ms total is negligible vs the pipeline duration.
  const cached = fileContentCache.get(filePath);
  if (cached) {
    try {
      const stat = statSync(filePath);
      if (stat.mtimeMs === cached.mtimeMs && stat.size === cached.size) {
        // Also re-check maxFileSize in case config changed between calls
        if (cached.result.content !== null || cached.size <= maxFileSize) {
          return cached.result;
        }
      }
      // File changed — evict stale entry
      cachedTotalBytes -= cached.contentBytes;
      fileContentCache.delete(filePath);
    } catch {
      // stat failed (file deleted?) — evict and fall through to normal read
      cachedTotalBytes -= cached.contentBytes;
      fileContentCache.delete(filePath);
    }
  }

  // Cache miss — read file normally (no extra overhead on first call)
  return readRawFile(filePath, maxFileSize, binaryDetectors);
};

/**
 * Synchronous cache probe: returns cached result or null if cache miss.
 * For warm MCP/website server runs, 95-100% of files hit the cache.
 * Using a plain synchronous function avoids the overhead of creating
 * ~1000 async function frames and Promises when all files are cached.
 * On cache miss, returns null so the caller can fall back to async I/O.
 */
export const probeFileCache = (
  filePath: string,
  maxFileSize: number,
  binaryDetectors: BinaryDetectors,
): FileReadResult | null => {
  // Check binary extension first (no I/O needed)
  if (binaryDetectors.isBinaryPath(filePath)) {
    return { content: null, skippedReason: 'binary-extension' };
  }

  const cached = fileContentCache.get(filePath);
  if (!cached) return null;

  try {
    const stat = statSync(filePath);
    if (stat.mtimeMs === cached.mtimeMs && stat.size === cached.size) {
      if (cached.result.content !== null || cached.size <= maxFileSize) {
        return cached.result;
      }
    }
    // File changed — evict stale entry
    cachedTotalBytes -= cached.contentBytes;
    fileContentCache.delete(filePath);
  } catch {
    cachedTotalBytes -= cached.contentBytes;
    fileContentCache.delete(filePath);
  }

  return null;
};

/**
 * Populate the file content cache after all files have been read.
 * Called once at the end of collectFiles to batch-stat all collected files.
 * This avoids interleaving stat calls with readFile calls which would compete
 * for libuv threads and slow down the first call.
 *
 * The batch stat runs AFTER all file reads complete, so stat calls hit the OS
 * page cache and complete in ~17ms for 1000 files (vs ~130ms for readFile).
 */
export const populateFileContentCache = async (
  files: ReadonlyArray<{ fullPath: string; result: FileReadResult }>,
): Promise<void> => {
  // Batch stat all files in parallel
  const statResults = await Promise.all(
    files.map(async ({ fullPath, result }) => {
      try {
        const stat = await fs.stat(fullPath);
        return { fullPath, result, stat };
      } catch {
        return null;
      }
    }),
  );

  // Build set of paths in the current batch for LRU-like eviction.
  // Entries from the current pack() call are always kept; stale entries from
  // previous calls are evicted first when the cache exceeds the size budget.
  const currentBatchPaths = new Set<string>();
  for (const entry of statResults) {
    if (entry) currentBatchPaths.add(entry.fullPath);
  }

  // Pre-collect stale entries (not in current batch) so eviction is O(n+m)
  // instead of O(n*m) — avoids scanning the map per eviction.
  const staleEntries: Array<[string, CachedFileEntry]> = [];
  for (const [path, cached] of fileContentCache) {
    if (!currentBatchPaths.has(path)) {
      staleEntries.push([path, cached]);
    }
  }
  let staleIdx = 0;

  for (const entry of statResults) {
    if (!entry) continue;
    const { fullPath, result, stat } = entry;
    const contentBytes = result.content !== null ? Buffer.byteLength(result.content, 'utf-8') : 0;

    // Evict stale entries from previous pack() calls until there's room
    while (cachedTotalBytes + contentBytes > MAX_CACHE_BYTES && staleIdx < staleEntries.length) {
      const [stalePath, staleCached] = staleEntries[staleIdx++];
      if (fileContentCache.has(stalePath)) {
        cachedTotalBytes -= staleCached.contentBytes;
        fileContentCache.delete(stalePath);
      }
    }

    // Skip if still over budget (all stale entries exhausted, single repo > 200MB)
    if (cachedTotalBytes + contentBytes > MAX_CACHE_BYTES) {
      continue;
    }

    fileContentCache.set(fullPath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      result,
      contentBytes,
    });
    cachedTotalBytes += contentBytes;
  }
};
