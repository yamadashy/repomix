import * as fs from 'node:fs/promises';
import isBinaryPath from 'is-binary-path';
import { isBinaryFileSync } from 'isbinaryfile';
import { logger } from '../../shared/logger.js';

// Lazy-load jschardet (~25ms) and iconv-lite (~14ms) since they're only needed
// for the ~1% of source files that aren't valid UTF-8 (e.g., Shift-JIS, EUC-KR).
// This avoids ~39ms of module loading overhead on every run.
type Jschardet = typeof import('jschardet');
type IconvLite = typeof import('iconv-lite');
let _jschardet: Jschardet | undefined;
let _iconv: IconvLite | undefined;

const getJschardet = async (): Promise<Jschardet> => {
  if (!_jschardet) {
    _jschardet = await import('jschardet');
  }
  return _jschardet;
};

const getIconv = async (): Promise<IconvLite> => {
  if (!_iconv) {
    _iconv = await import('iconv-lite');
  }
  return _iconv;
};

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
    // Check binary extension first (sync, no I/O) before any filesystem calls
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    logger.trace(`Reading file: ${filePath}`);

    // Check file size with fs.stat() before reading to avoid loading very large files
    // (e.g., multi-GB database dumps) into memory just to discard them.
    const stats = await fs.stat(filePath);
    if (stats.size > maxFileSize) {
      const sizeKB = (stats.size / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    const buffer = await fs.readFile(filePath);

    // Use sync version — the check is already synchronous on a buffer,
    // the async wrapper only adds unnecessary Promise overhead per file.
    if (isBinaryFileSync(buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    // Fast path: Try UTF-8 decoding first (covers ~99% of source code files)
    // This skips the expensive jschardet.detect() which scans the entire buffer
    // through multiple encoding probers with frequency table lookups
    try {
      let content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1); // strip UTF-8 BOM
      }
      return { content };
    } catch {
      // Not valid UTF-8, fall through to encoding detection
    }

    // Slow path: Detect encoding with jschardet for non-UTF-8 files (e.g., Shift-JIS, EUC-KR)
    const [jschardetMod, iconvMod] = await Promise.all([getJschardet(), getIconv()]);
    const { encoding: detectedEncoding } = jschardetMod.detect(buffer) ?? {};
    const encoding = detectedEncoding && iconvMod.encodingExists(detectedEncoding) ? detectedEncoding : 'utf-8';
    const content = iconvMod.decode(buffer, encoding, { stripBOM: true });

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
