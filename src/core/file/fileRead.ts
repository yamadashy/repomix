import * as fs from 'node:fs/promises';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile } from 'isbinaryfile';
import { logger } from '../../shared/logger.js';

// Lazy-load encoding detection libraries to avoid their ~25ms combined import cost.
// The fast UTF-8 path (covers ~99% of source code files) never needs these;
// they are only loaded when a file fails UTF-8 decoding.
// Caching the Promise (not the resolved values) guarantees exactly one import
// regardless of how many concurrent calls hit the slow path.
let _encodingDepsPromise: Promise<{ jschardet: typeof import('jschardet'); iconv: typeof import('iconv-lite') }>;
const getEncodingDeps = () => {
  _encodingDepsPromise ??= Promise.all([import('jschardet'), import('iconv-lite')]).then(([jschardet, iconv]) => ({
    jschardet,
    iconv,
  }));
  return _encodingDepsPromise;
};

// Reuse a single TextDecoder instance across all file reads.
// TextDecoder.decode() is stateless — each call is independent per the WHATWG spec.
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export type FileSkipReason = 'binary-extension' | 'binary-content' | 'size-limit' | 'encoding-error';

export interface FileReadResult {
  content: string | null;
  skippedReason?: FileSkipReason;
}

/**
 * Read a file and return its text content
 * @param filePath Path to the file
 * @param maxFileSize Maximum file size in bytes
 * @returns File content as string and skip reason if file was skipped
 */
export const readRawFile = async (filePath: string, maxFileSize: number): Promise<FileReadResult> => {
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
    const buffer = await fs.readFile(filePath);

    if (buffer.length > maxFileSize) {
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    // Fast path: Try UTF-8 decoding first (covers ~99% of source code files).
    // Valid UTF-8 files are guaranteed to be text, so we skip the isBinaryFile
    // buffer scan entirely (~16ms saved across ~1000 files).
    try {
      let content = utf8Decoder.decode(buffer);
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1); // strip UTF-8 BOM
      }
      return { content };
    } catch {
      // Not valid UTF-8, fall through to binary check + encoding detection
    }

    // Only check binary content for files that failed UTF-8 decoding.
    // This avoids the isBinaryFile buffer scan for the vast majority of
    // source code files that are valid UTF-8.
    if (await isBinaryFile(buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    // Slow path: Detect encoding with jschardet for non-UTF-8 files (e.g., Shift-JIS, EUC-KR)
    const encodingDeps = await getEncodingDeps();
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

