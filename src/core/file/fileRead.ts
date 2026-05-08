import { readFile as readFileCb } from 'node:fs';
import { promisify } from 'node:util';
import isBinaryPath from 'is-binary-path';
import { isBinaryFile } from 'isbinaryfile';
import { logger } from '../../shared/logger.js';

// `node:fs/promises` wraps every read in a `FileHandle` object, paying ~60μs
// of JS-side bookkeeping per call vs. the lower-overhead callback-based
// `fs.readFile` path. With ~1000 files draining concurrently, the overhead
// compounds. `util.promisify(fs.readFile)` returns the same Buffer with
// significantly less per-call work — measured ~60% faster on 1000 small files.
const readFile = promisify(readFileCb);

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

/**
 * Check whether the buffer starts with a known text-encoding BOM. UTF-16 and
 * UTF-32 sprinkle NULL bytes through text content (UTF-16 LE encodes ASCII `A`
 * as `0x41 0x00`; UTF-32 BE BOM is `0x00 0x00 0xFE 0xFF`), so the cheap
 * NULL-byte binary probe would otherwise misclassify them. UTF-8 BOM is
 * included so buffers like `EF BB BF 00 41` (UTF-8 BOM + NULL + 'A') keep the
 * `isbinaryfile` short-circuit-to-text behavior they had before this PR.
 * Byte patterns mirror `isbinaryfile`'s own BOM-exemption checks.
 */
const hasTextBom = (buffer: Buffer): boolean => {
  // UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return true;
  }
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

    // Read the file directly and check size afterward, avoiding a separate stat() syscall.
    // This halves the number of I/O operations per file.
    // Files exceeding maxFileSize are rare, so the occasional oversized read is acceptable.
    const buffer = await readFile(filePath);

    if (buffer.length > maxFileSize) {
      const sizeKB = (buffer.length / 1024).toFixed(1);
      const maxSizeKB = (maxFileSize / 1024).toFixed(1);
      logger.trace(`File exceeds size limit: ${sizeKB}KB > ${maxSizeKB}KB (${filePath})`);
      return { content: null, skippedReason: 'size-limit' };
    }

    // NULL-byte probe across the whole buffer (native `Buffer.indexOf` is a
    // SIMD-backed scan, not a JS loop). NULL is U+0000 — valid UTF-8 — so
    // without this probe a buffer containing NULL would pass the
    // `TextDecoder('utf-8', { fatal: true })` fast path below and be packed
    // as text, but NULL is unrepresentable in XML 1.0 output and would break
    // downstream parsers. Catching it here also lets the common UTF-8 path
    // skip the full `isBinaryFile` call, which has a pathological case in
    // `isbinaryfile`'s protobuf detector that can spend seconds on certain
    // valid-UTF-8 byte patterns (e.g. a 4 KB Korean Markdown file measured
    // at ~3500ms on this branch) before throwing `Invalid array length`.
    //
    // BOM-marked text files (UTF-8 / UTF-16 / UTF-32 / GB18030) are exempted:
    // UTF-16/UTF-32 sprinkle NULLs through legitimate text content; UTF-8
    // BOM is exempted for parity with `isbinaryfile`'s short-circuit (a
    // buffer like `EF BB BF 00 41` was treated as text before this PR).
    if (!hasTextBom(buffer) && buffer.indexOf(0) !== -1) {
      logger.debug(`Skipping binary file (null-byte probe): ${filePath}`);
      return { content: null, skippedReason: 'binary-content' };
    }

    // Fast path: Try UTF-8 decoding first (covers ~99% of source code files).
    // This skips the expensive jschardet.detect() which scans the entire buffer
    // through multiple encoding probers with frequency table lookups, and skips
    // the full `isBinaryFile` call (see note above).
    try {
      let content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1); // strip UTF-8 BOM
      }
      return { content };
    } catch {
      // Not valid UTF-8, fall through to binary check + encoding detection
    }

    // Buffer is not valid UTF-8. Run the full `isBinaryFile` check now to
    // distinguish real binaries (PE/ELF/PNG/etc.) from legacy-encoded text
    // (Shift-JIS, EUC-KR, GBK, …) that should still reach the slow path.
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
