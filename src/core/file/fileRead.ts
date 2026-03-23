import * as fs from 'node:fs/promises';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile } from 'isbinaryfile';
import { logger } from '../../shared/logger.js';

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
    // Check binary extension before any I/O to skip read for obvious binary files
    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    logger.trace(`Reading file: ${filePath}`);

    // Read file directly without a separate stat() call.
    // This saves one syscall per file (~25ms for 1000 files).
    // Binary extensions are already filtered above, and the default maxFileSize (50MB)
    // means very few non-binary files will exceed it.
    const buffer = await fs.readFile(filePath);

    if (buffer.length > maxFileSize) {
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

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
    // Lazy-load jschardet (~25ms) and iconv-lite (~14ms) since they're only needed for ~1% of files
    const [jschardet, iconv] = await Promise.all([
      import('jschardet').then((m) => m.default),
      import('iconv-lite').then((m) => m.default),
    ]);
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
