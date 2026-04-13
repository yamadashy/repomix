import { logger } from '../../shared/logger.js';
import type { ProcessedFile } from '../file/fileTypes.js';

export type OutputStyle = 'xml' | 'markdown' | 'plain';

/**
 * Extract the "wrapper" portion of a generated output: the output string minus
 * every file's content. Returns `null` if any file's content cannot be located
 * in the output (e.g., the template escaped it, the output was split, or the
 * processedFiles order does not match the output order).
 *
 * When `style` is provided, uses a tag-based fast path that searches for short
 * file-path markers (~40 chars each) instead of full file contents (~4KB avg).
 * This avoids ~4MB of substring verification, reducing cold-call time from
 * ~28ms to ~1ms on a 1000-file repo.
 *
 * Falls back to the content-based approach when tag search fails or when style
 * is not provided (e.g., Handlebars/parsable output).
 */
export const extractOutputWrapper = (
  output: string,
  processedFilesInOutputOrder: ReadonlyArray<ProcessedFile>,
  style?: OutputStyle,
): string | null => {
  if (style) {
    const fast = extractOutputWrapperByTags(output, processedFilesInOutputOrder, style);
    if (fast !== null) return fast;
    logger.trace('Tag-based wrapper extraction failed, falling back to content scan');
  }
  return extractOutputWrapperByContent(output, processedFilesInOutputOrder);
};

/**
 * Tag-based fast path: locate each file's content by searching for a short
 * file-path marker in the output, then skip past the content using its known
 * length. This is ~25x faster than the content-based scan because V8's
 * indexOf verifies only ~40 chars per file instead of the full content.
 */
const extractOutputWrapperByTags = (
  output: string,
  files: ReadonlyArray<ProcessedFile>,
  style: OutputStyle,
): string | null => {
  const wrapperSegments: string[] = [];
  let cursor = 0;

  for (const file of files) {
    if (file.content.length === 0) continue;

    const contentStart = findContentStart(output, file.path, cursor, style);
    if (contentStart === -1) return null;

    // Verify content boundaries: check first and last 16 chars to catch stale
    // or mismatched outputs. This adds ~32KB of verification for 1000 files
    // (negligible) vs ~4MB for full-content indexOf.
    if (!verifyContentBoundaries(output, contentStart, file.content)) return null;

    wrapperSegments.push(output.slice(cursor, contentStart));
    cursor = contentStart + file.content.length;
  }

  wrapperSegments.push(output.slice(cursor));
  return wrapperSegments.join('');
};

// Number of characters to verify at each boundary (prefix + suffix).
// 16 chars per boundary × 2 boundaries × 1000 files = ~32KB total verification,
// negligible compared to ~4MB for full-content indexOf.
const VERIFY_LEN = 16;

const verifyContentBoundaries = (output: string, contentStart: number, content: string): boolean => {
  const len = content.length;
  const checkLen = Math.min(VERIFY_LEN, len);

  // Prefix check
  for (let i = 0; i < checkLen; i++) {
    if (output.charCodeAt(contentStart + i) !== content.charCodeAt(i)) return false;
  }

  // Suffix check (may overlap with prefix for short content — harmless)
  const suffixOffset = len - checkLen;
  for (let i = 0; i < checkLen; i++) {
    if (output.charCodeAt(contentStart + suffixOffset + i) !== content.charCodeAt(suffixOffset + i)) return false;
  }

  return true;
};

/**
 * Find the byte offset where a file's content begins in the output string,
 * given the output style and a search cursor.
 *
 * XML:      <file path="PATH">\n{content}
 * Markdown: ## File: PATH\n```lang\n{content}
 * Plain:    ================\nFile: PATH\n================\n{content}
 */
const findContentStart = (output: string, filePath: string, cursor: number, style: OutputStyle): number => {
  switch (style) {
    case 'xml': {
      const tag = `<file path="${filePath}">\n`;
      const idx = output.indexOf(tag, cursor);
      return idx === -1 ? -1 : idx + tag.length;
    }
    case 'markdown': {
      const tag = `## File: ${filePath}\n`;
      const idx = output.indexOf(tag, cursor);
      if (idx === -1) return -1;
      // Skip the code fence line (```lang\n) after the ## File header
      const fenceLineEnd = output.indexOf('\n', idx + tag.length);
      return fenceLineEnd === -1 ? -1 : fenceLineEnd + 1;
    }
    case 'plain': {
      const tag = `File: ${filePath}\n`;
      const idx = output.indexOf(tag, cursor);
      if (idx === -1) return -1;
      // Skip the separator line (================\n) after the File: header
      const sepEnd = output.indexOf('\n', idx + tag.length);
      return sepEnd === -1 ? -1 : sepEnd + 1;
    }
  }
};

/**
 * Content-based fallback: find each file's content using indexOf(content).
 * Handles all output styles including Handlebars/parsable output where tag
 * formats may differ. Slower because indexOf verifies full content matches.
 */
const extractOutputWrapperByContent = (
  output: string,
  processedFilesInOutputOrder: ReadonlyArray<ProcessedFile>,
): string | null => {
  const wrapperSegments: string[] = [];
  let cursor = 0;
  for (const file of processedFilesInOutputOrder) {
    if (file.content.length === 0) continue;

    const idx = output.indexOf(file.content, cursor);
    if (idx === -1) return null;

    wrapperSegments.push(output.slice(cursor, idx));
    cursor = idx + file.content.length;
  }
  wrapperSegments.push(output.slice(cursor));
  return wrapperSegments.join('');
};
