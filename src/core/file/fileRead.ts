import fsSync from 'node:fs';
import * as fsAsync from 'node:fs/promises';
import iconv from 'iconv-lite';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile, isBinaryFileSync } from 'isbinaryfile';
import jschardet from 'jschardet';
import { logger } from '../../shared/logger.js';

export type FileSkipReason = 'binary-extension' | 'binary-content' | 'size-limit' | 'encoding-error';

export interface FileReadResult {
  content: string | null;
  skippedReason?: FileSkipReason;
}

/**
 * Decode a buffer to string, handling UTF-8 fast path and encoding detection slow path.
 */
const decodeBuffer = (buffer: Buffer, filePath: string): FileReadResult => {
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
  const { encoding: detectedEncoding } = jschardet.detect(buffer) ?? {};
  const encoding = detectedEncoding && iconv.encodingExists(detectedEncoding) ? detectedEncoding : 'utf-8';
  const content = iconv.decode(buffer, encoding, { stripBOM: true });

  if (content.includes('\uFFFD')) {
    logger.debug(`Skipping file due to encoding errors (detected: ${encoding}): ${filePath}`);
    return { content: null, skippedReason: 'encoding-error' };
  }

  return { content };
};

/**
 * Read a file synchronously and return its text content.
 * Uses readFileSync to avoid Promise/libuv-threadpool overhead for ~1000 small files.
 */
export const readRawFileSync = (filePath: string, maxFileSize: number): FileReadResult => {
  try {
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    const stats = fsSync.statSync(filePath);

    if (stats.size > maxFileSize) {
      const sizeKB = (stats.size / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    logger.trace(`Reading file: ${filePath}`);

    const buffer = fsSync.readFileSync(filePath);

    if (isBinaryFileSync(buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    return decodeBuffer(buffer, filePath);
  } catch (error) {
    logger.warn(`Failed to read file: ${filePath}`, error);
    return { content: null, skippedReason: 'encoding-error' };
  }
};

/**
 * Read a file asynchronously and return its text content
 * @param filePath Path to the file
 * @param maxFileSize Maximum file size in bytes
 * @returns File content as string and skip reason if file was skipped
 */
export const readRawFile = async (filePath: string, maxFileSize: number): Promise<FileReadResult> => {
  try {
    // Check binary extension first (no I/O needed) to skip stat + read for binary files
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    const stats = await fsAsync.stat(filePath);

    if (stats.size > maxFileSize) {
      const sizeKB = (stats.size / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    logger.trace(`Reading file: ${filePath}`);

    const buffer = await fsAsync.readFile(filePath);

    if (await isBinaryFile(buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    return decodeBuffer(buffer, filePath);
  } catch (error) {
    logger.warn(`Failed to read file: ${filePath}`, error);
    return { content: null, skippedReason: 'encoding-error' };
  }
};
