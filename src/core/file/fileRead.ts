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
 * Read a file and return its text content
 * @param filePath Path to the file
 * @param maxFileSize Maximum file size in bytes
 * @returns File content as string and skip reason if file was skipped
 */
export const readRawFile = async (filePath: string, maxFileSize: number): Promise<FileReadResult> => {
  try {
    const stats = await fs.stat(filePath);

    if (stats.size > maxFileSize) {
      const sizeKB = (stats.size / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    if (isBinaryPath(filePath)) {
      logger.debug(`Skipping binary file: ${filePath}`);
      return { content: null, skippedReason: 'binary-extension' };
    }

    logger.trace(`Reading file: ${filePath}`);

    const buffer = await fs.readFile(filePath);

    if (await isBinaryFile(buffer)) {
      logger.debug(`Skipping binary file (content check): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    const { encoding: detectedEncoding } = jschardet.detect(buffer) ?? {};
    const encoding = detectedEncoding && iconv.encodingExists(detectedEncoding) ? detectedEncoding : 'utf-8';

    const content = iconv.decode(buffer, encoding, { stripBOM: true });

    // Only skip if there are actual decode errors (U+FFFD replacement characters)
    // Don't rely on jschardet confidence as it can return low values for valid UTF-8/ASCII files
    if (content.includes('\uFFFD')) {
      // For UTF-8, distinguish invalid byte sequences from a legitimate U+FFFD in the source
      if (encoding.toLowerCase() === 'utf-8') {
        try {
          let utf8 = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
          if (utf8.charCodeAt(0) === 0xfeff) utf8 = utf8.slice(1); // strip UTF-8 BOM
          return { content: utf8 };
        } catch {
          // fall through to skip below
        }
      }
      logger.debug(`Skipping file due to encoding errors (detected: ${encoding}): ${filePath}`);
      return { content: null, skippedReason: 'encoding-error' };
    }

    return { content };
  } catch (error) {
    logger.warn(`Failed to read file: ${filePath}`, error);
    return { content: null, skippedReason: 'encoding-error' };
  }
};
