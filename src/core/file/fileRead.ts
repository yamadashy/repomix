import fsSync from 'node:fs';
import * as fsAsync from 'node:fs/promises';
import { createRequire } from 'node:module';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile, isBinaryFileSync } from 'isbinaryfile';
import { logger } from '../../shared/logger.js';

// Lazy-load jschardet and iconv-lite: only needed for non-UTF-8 files (~1% of source code).
// By deferring these imports, we save ~26ms from the startup critical path.
// They are never loaded at all when all files are UTF-8 (the common case).
const esmRequire = createRequire(import.meta.url);
let _jschardet: typeof import('jschardet') | undefined;
let _iconv: typeof import('iconv-lite') | undefined;
const getJschardet = (): typeof import('jschardet') => (_jschardet ??= esmRequire('jschardet'));
const getIconv = (): typeof import('iconv-lite') => (_iconv ??= esmRequire('iconv-lite'));

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
  const jschardet = getJschardet();
  const iconv = getIconv();
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

    logger.trace(`Reading file: ${filePath}`);

    // Read the file directly, skipping the separate statSync call.
    // readFileSync already returns the full buffer whose .length gives the file size,
    // eliminating one syscall per file (~22ms savings for ~1000 files).
    // Trade-off: files exceeding maxFileSize are read into memory before rejection.
    // This is acceptable because isBinaryPath already filters large binary files (images,
    // videos, archives) by extension, and source repos rarely contain non-binary files
    // exceeding the 50MB default limit.
    const buffer = fsSync.readFileSync(filePath);

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
