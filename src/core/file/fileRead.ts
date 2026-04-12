import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import isBinaryPath from 'is-binary-path';
import { isBinaryFileSync } from 'isbinaryfile';
import { logger } from '../../shared/logger.js';

// Module-level singleton for the common UTF-8 path. TextDecoder without
// { stream: true } resets internal state on each decode() call, so a single
// instance is safe for reuse across sequential calls.
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

// Lazy-load encoding detection libraries. The fast UTF-8 path (covers ~99%
// of source code files) never needs these; they are only loaded when a file
// fails UTF-8 decoding. Using synchronous require() via createRequire keeps
// the readRawFile call stack fully synchronous.
let _encodingDeps: { jschardet: typeof import('jschardet'); iconv: typeof import('iconv-lite') } | undefined;
const getEncodingDepsSync = (): { jschardet: typeof import('jschardet'); iconv: typeof import('iconv-lite') } => {
  if (!_encodingDeps) {
    const require = createRequire(import.meta.url);
    _encodingDeps = {
      jschardet: require('jschardet') as typeof import('jschardet'),
      iconv: require('iconv-lite') as typeof import('iconv-lite'),
    };
  }
  return _encodingDeps;
};

export type FileSkipReason = 'binary-extension' | 'binary-content' | 'size-limit' | 'encoding-error';

export interface FileReadResult {
  content: string | null;
  skippedReason?: FileSkipReason;
}

/**
 * Read a file and return its text content.
 *
 * Uses synchronous I/O (readFileSync) because for many small source files the
 * per-file async overhead (Promise creation, event-loop scheduling, libuv
 * thread-pool dispatch) dominates: ~95ms for 1000 files async vs ~10ms sync.
 * Sync reads also eliminate CPU contention between the event loop and
 * worker-thread warm-up that otherwise inflates collection time by ~100ms.
 *
 * @param filePath Path to the file
 * @param maxFileSize Maximum file size in bytes
 * @returns File content as string and skip reason if file was skipped
 */
export const readRawFile = (filePath: string, maxFileSize: number): FileReadResult => {
  try {
    // Check binary extension first (no I/O needed) to skip read for binary files
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    logger.trace(`Reading file: ${filePath}`);

    // Read the file directly and check size afterward, avoiding a separate stat() syscall.
    // This halves the number of I/O operations per file.
    // Files exceeding maxFileSize are rare, so the occasional oversized read is acceptable.
    const buffer = fs.readFileSync(filePath);

    if (buffer.length > maxFileSize) {
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

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
    const encodingDeps = getEncodingDepsSync();
    const { encoding: detectedEncoding } = encodingDeps.jschardet.detect(buffer) ?? {};
    const encoding =
      detectedEncoding && encodingDeps.iconv.encodingExists(detectedEncoding) ? detectedEncoding : 'utf-8';
    const content = encodingDeps.iconv.decode(buffer, encoding, { stripBOM: true });

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
