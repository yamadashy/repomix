import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import iconv from 'iconv-lite';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile } from 'isbinaryfile';
import jschardet from 'jschardet';
import { logger } from '../../shared/logger.js';

export type FileSkipReason = 'binary-extension' | 'binary-content' | 'size-limit' | 'encoding-error';

export interface FileReadResult {
  content: string | null;
  skippedReason?: FileSkipReason;
}

/**
 * Synchronous file read using direct UTF-8 string decoding.
 * Bypasses Buffer allocation, isBinaryFile async check, and TextDecoder overhead.
 * Returns null when async fallback is needed (non-UTF-8 files with U+FFFD, or errors).
 */
export const readRawFileSync = (filePath: string, maxFileSize: number): FileReadResult | null => {
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

    logger.trace(`Reading file (sync): ${filePath}`);

    // readFileSync with 'utf-8' encoding goes directly from raw bytes to V8 String
    // in Node's C++ layer, bypassing Buffer JS object allocation and GC tracking.
    // Node's lenient UTF-8 decoder replaces invalid bytes with U+FFFD instead of throwing.
    const content = fsSync.readFileSync(filePath, 'utf-8');

    // Binary content detection: null bytes indicate binary content
    if (content.indexOf('\0') !== -1) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    // U+FFFD may be a lenient decoder replacement for invalid UTF-8 bytes,
    // or a legitimate character in the source. Fall back to async path with
    // strict TextDecoder to distinguish the two cases.
    if (content.indexOf('\uFFFD') !== -1) {
      return null;
    }

    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
      return { content: content.slice(1) };
    }

    return { content };
  } catch {
    // Fall back to async path for permission errors, etc.
    return null;
  }
};

export const readRawFile = async (filePath: string, maxFileSize: number): Promise<FileReadResult> => {
  try {
    // Check binary extension first (no I/O needed) to skip stat + read for binary files
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    const stats = await fs.stat(filePath);

    if (stats.size > maxFileSize) {
      const sizeKB = (stats.size / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    logger.trace(`Reading file: ${filePath}`);

    const buffer = await fs.readFile(filePath);

    if (await isBinaryFile(buffer)) {
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
    const { encoding: detectedEncoding } = jschardet.detect(buffer) ?? {};
    const encoding = detectedEncoding && iconv.encodingExists(detectedEncoding) ? detectedEncoding : 'utf-8';
    const content = iconv.decode(buffer, encoding, { stripBOM: true });

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
