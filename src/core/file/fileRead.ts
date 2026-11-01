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
 * `isbinaryfile` decides from the first 512 bytes and counts every high byte that
 * is not part of a well-formed UTF-8 sequence as suspicious, bailing out above a
 * 10% ratio. Double-byte text (Shift-JIS, EUC-KR, GBK) is almost entirely high
 * bytes, so it is always rated binary — which is why it needs a second opinion
 * before being dropped: a confidently detected single- or double-byte encoding
 * that decodes to printable text is text, whatever the byte-ratio heuristic says.
 *
 * The floor is deliberately strict. Measured on the encodings this path exists
 * for: Shift-JIS 1.00, EUC-KR 0.99, GB2312 0.99, windows-1252 0.95 — while a
 * PDF-shaped binary scores 0.25 and decodes to replacement characters, so it
 * keeps its `binary-content` verdict. Anything ambiguous stays as it is today.
 */
const LEGACY_TEXT_MIN_CONFIDENCE = 0.9;

/**
 * Whether `text` contains a C0 control (other than tab, LF and CR) or DEL. Text
 * in any of the encodings above never does: Shift-JIS, EUC-KR and GBK keep their
 * non-ASCII bytes at 0x80 and above, and their multi-byte sequences stay out of
 * the control range.
 */
const hasControlChars = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const whitespace = code === 0x09 || code === 0x0a || code === 0x0d;
    if ((code < 0x20 && !whitespace) || code === 0x7f) {
      return true;
    }
  }
  return false;
};

/**
 * Whether `text` is line- or word-structured, i.e. contains a character that
 * separates words or lines. Structural whitespace stays ASCII through decoding in
 * every encoding this path handles, so its presence is strong evidence that the
 * decode produced text rather than garbage.
 */
const hasWordSeparators = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) {
      return true;
    }
  }
  return false;
};

/**
 * The fallback signal for text that has no separators at all — a run of CJK prose,
 * which is normal, has as much right to be packed as a source file. What it
 * distinguishes is replayed byte cycles: high-byte filler (a 0xFF padded tail, a
 * repeated 2-byte pattern) decodes through these encodings into one or two
 * characters repeated forever, and it reaches this branch routinely because
 * `isbinaryfile` sees nothing suspicious in a buffer that has no control bytes.
 *
 * Measured over 168 cyclic patterns of period 1-16: every one that the detector
 * scores at or above `LEGACY_TEXT_MIN_CONFIDENCE` decodes to at most 3 distinct
 * characters, while the shortest realistic separator-free CJK sample needs 7.
 */
const LEGACY_TEXT_MIN_DISTINCT_CHARS = 4;

/**
 * Whether a clean decode is text rather than a replayed byte cycle: structured by
 * separators, or diverse enough to be an alphabet.
 */
const looksLikeText = (text: string): boolean => {
  if (hasWordSeparators(text)) {
    return true;
  }
  return new Set(text).size >= LEGACY_TEXT_MIN_DISTINCT_CHARS;
};

/**
 * Decode `buffer` as legacy-encoded text, or return null when it does not look
 * like text unambiguously (unknown encoding, low detection confidence, or a
 * decode that needs replacement characters, contains control codes, or replays a
 * short byte cycle).
 */
const detectLegacyEncodedText = async (buffer: Buffer): Promise<string | null> => {
  const encodingDeps = await getEncodingDeps();
  const detected = encodingDeps.jschardet.detect(buffer);
  const encoding =
    detected?.encoding && encodingDeps.iconv.encodingExists(detected.encoding) ? detected.encoding : null;
  if (!encoding || (detected?.confidence ?? 0) < LEGACY_TEXT_MIN_CONFIDENCE) {
    return null;
  }

  const content = encodingDeps.iconv.decode(buffer, encoding, { stripBOM: true });
  return content.includes('\uFFFD') || hasControlChars(content) || !looksLikeText(content) ? null : content;
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
    const buffer = await fs.readFile(filePath);

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
    //
    // `isbinaryfile` cannot make that distinction on its own, so when it says
    // binary ask the detector before dropping the file: it only inspects the
    // first 512 bytes and counts every high byte outside a UTF-8 sequence as
    // suspicious, bailing above a 10% ratio. Double-byte text is almost entirely
    // high bytes, so a real Shift-JIS source file is always rated binary and the
    // slow path below — which exists precisely for those encodings — never sees
    // it. Overturn the verdict only on an unambiguous win, so anything ambiguous
    // keeps being skipped exactly as it is today.
    if (await isBinaryFile(buffer)) {
      const legacyText = await detectLegacyEncodedText(buffer);
      if (legacyText === null) {
        logger.debug(`Skipping binary file (content check): ${filePath}`);
        return { content: null, skippedReason: 'binary-content' };
      }
      return { content: legacyText };
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
