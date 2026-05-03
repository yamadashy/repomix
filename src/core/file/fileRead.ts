import { readFileSync } from 'node:fs';
import isBinaryPath from 'is-binary-path';
import { isBinaryFileSync } from 'isbinaryfile';
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

export type FileSkipReason = 'binary-extension' | 'binary-content' | 'size-limit' | 'encoding-error';

export interface FileReadResult {
  content: string | null;
  skippedReason?: FileSkipReason;
}

// Number of leading bytes to inspect for the cheap null-byte binary probe.
// Mirrors `isbinaryfile`'s `MAX_BYTES` so the probe covers the same window
// the library would have considered for the strongest binary signal.
const BINARY_PROBE_BYTES = 512;

/**
 * Check whether the buffer starts with a UTF-16/UTF-32 BOM. These encodings
 * place NULL bytes throughout text content (UTF-16 LE encodes ASCII `A` as
 * `0x41 0x00`; UTF-32 BE BOM is `0x00 0x00 0xFE 0xFF`), so the cheap
 * NULL-byte binary probe would otherwise misclassify them. Files matched
 * here fall through to the slow path's jschardet+iconv encoding detection,
 * matching the pre-change behavior. Byte patterns mirror `isbinaryfile`'s
 * own BOM-exemption checks in `isBinaryCheck`.
 */
const hasNonUtf8TextBom = (buffer: Buffer): boolean => {
  // UTF-32 BE BOM
  if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xfe && buffer[3] === 0xff) {
    return true;
  }
  // UTF-32 LE BOM
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xfe && buffer[2] === 0x00 && buffer[3] === 0x00) {
    return true;
  }
  // GB 18030 BOM
  if (buffer.length >= 4 && buffer[0] === 0x84 && buffer[1] === 0x31 && buffer[2] === 0x95 && buffer[3] === 0x33) {
    return true;
  }
  // UTF-16 BE BOM (must come after UTF-32 LE, which shares the leading 0xff 0xfe)
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return true;
  }
  // UTF-16 LE BOM (must come after UTF-32 LE check above)
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return true;
  }
  return false;
};

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

    // readFileSync avoids the per-call libuv + Promise + microtask overhead
    // (~0.09ms/file) that dominates wall-clock when files are page-cached.
    // Read directly and check size afterward to avoid a separate stat() syscall.
    const buffer = readFileSync(filePath);

    if (buffer.length > maxFileSize) {
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    // Fast binary probe: scan the leading bytes for a NULL byte. NULL is the
    // single strongest binary signal (executables, images with embedded
    // metadata, compiled formats all carry one in their header) and it's
    // also the only `isBinaryCheck` rule that triggers on inputs that would
    // pass `TextDecoder('utf-8', { fatal: true })` — NULL is U+0000, valid
    // UTF-8. Catching it here lets the common UTF-8 path below skip the
    // full `isBinaryFileSync` call, which has a pathological case in
    // `isbinaryfile`'s protobuf detector that can spend several seconds on
    // certain valid-UTF-8 byte patterns (e.g. a 4 KB Korean Markdown file
    // measured at ~3500ms on this branch) before throwing `Invalid array
    // length`. Such files were silently dropped as `encoding-error` after
    // the throw was caught below — fixing that side-effect along with the
    // wall-clock cost.
    //
    // UTF-16/UTF-32 text files contain NULLs throughout their content but
    // are not binary; they were previously rescued by `isBinaryFileSync`'s
    // BOM exemption and then decoded via jschardet+iconv. Skip the probe
    // for them so they still reach the slow path unchanged.
    if (!hasNonUtf8TextBom(buffer)) {
      const probeLen = Math.min(buffer.length, BINARY_PROBE_BYTES);
      for (let i = 0; i < probeLen; i++) {
        if (buffer[i] === 0) {
          logger.debug(`Skipping binary file (null-byte probe): ${filePath}`);
          return { content: null, skippedReason: 'binary-content' };
        }
      }
    }

    // Fast path: Try UTF-8 decoding first (covers ~99% of source code files)
    // This skips the expensive jschardet.detect() which scans the entire buffer
    // through multiple encoding probers with frequency table lookups, and skips
    // the full `isBinaryFileSync` call (see note above).
    try {
      let content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1); // strip UTF-8 BOM
      }
      return { content };
    } catch {
      // Not valid UTF-8, fall through to binary check + encoding detection
    }

    // Buffer is not valid UTF-8. Run the full `isBinaryFileSync` check now —
    // the null-byte probe above already excluded the strongest binary signal,
    // so reaching this point means the remaining `isBinaryCheck` heuristics
    // (PDF magic, suspicious-byte ratio, protobuf shape) decide the outcome.
    if (isBinaryFileSync(buffer)) {
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
