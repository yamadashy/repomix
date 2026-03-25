import * as fs from 'node:fs/promises';
import { logger } from '../../shared/logger.js';

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
 * Read a file and return its text content
 * @param filePath Path to the file
 * @param maxFileSize Maximum file size in bytes
 * @returns File content as string and skip reason if file was skipped
 */
export const readRawFile = async (filePath: string, maxFileSize: number): Promise<FileReadResult> => {
  try {
    // Check binary extension first (no I/O needed) to skip stat + read for binary files
    const isBinaryPath = await getIsBinaryPath();
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

    const isBinaryFileSync = await getIsBinaryFileSync();
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
