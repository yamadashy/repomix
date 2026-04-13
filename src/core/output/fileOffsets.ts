import type { RepomixOutputStyle } from '../../config/configSchema.js';

export interface FileLineOffset {
  start: number;
  end: number;
}

/**
 * Iterator that walks through a string line-by-line using indexOf('\n') without
 * allocating an array of all lines, keeping memory overhead proportional to
 * one line at a time rather than the entire output.
 */
function* iterLines(s: string): Generator<{ line: string; lineNum: number }> {
  let pos = 0;
  let lineNum = 1;
  while (pos <= s.length) {
    const next = s.indexOf('\n', pos);
    const end = next === -1 ? s.length : next;
    yield { line: s.slice(pos, end), lineNum };
    if (next === -1) break;
    pos = next + 1;
    lineNum++;
  }
}

/** Total number of lines in a string (fast count via indexOf). */
const countLines = (s: string): number => {
  let count = 1;
  let pos = 0;
  let found = s.indexOf('\n', pos);
  while (found !== -1) {
    count++;
    pos = found + 1;
    found = s.indexOf('\n', pos);
  }
  return count;
};

/**
 * Returns the 1-indexed line number where the files section starts in the output.
 * Restricting offset scanning to this section prevents false matches when a file's
 * own content contains marker strings (e.g., a file that itself contains XML tags
 * or Markdown headings matching our patterns).
 */
const findFilesSectionStartLine = (output: string, style: RepomixOutputStyle): number => {
  const LONG_SEPARATOR = '='.repeat(64);
  let prevLine = '';

  for (const { line, lineNum } of iterLines(output)) {
    if (style === 'xml' && line.trim() === '<files>') return lineNum;
    if (style === 'markdown' && line === '# Files') return lineNum;
    if (style === 'plain' && prevLine === LONG_SEPARATOR && line === 'Files') return lineNum - 1;
    prevLine = line;
  }
  return 1; // fallback: scan entire output
};

/**
 * Scans a rendered output string and returns the line range (1-indexed, inclusive)
 * for each file's content block.
 *
 * Scanning is restricted to the files section of the output to avoid false matches
 * from file content that happens to contain marker strings.
 *
 * Supports XML, Markdown, and plain text output styles.
 * JSON output is structured and does not use this function.
 *
 * Uses indexOf-based line iteration to avoid duplicating the entire output string
 * as an array of lines.
 */
export const computeFileLineOffsets = (output: string, style: RepomixOutputStyle): Record<string, FileLineOffset> => {
  const offsets: Record<string, FileLineOffset> = {};
  const sectionStartLine = findFilesSectionStartLine(output, style);

  if (style === 'xml') {
    let currentPath: string | null = null;
    let currentStart = 0;

    for (const { line, lineNum } of iterLines(output)) {
      if (lineNum < sectionStartLine) continue;

      // Allow optional surrounding whitespace; use non-greedy [^"]+ to match path
      const startMatch = line.match(/^\s*<file path="([^"]+)">\s*$/);
      if (startMatch) {
        currentPath = startMatch[1];
        currentStart = lineNum;
      } else if (line.trim() === '</file>' && currentPath !== null) {
        offsets[currentPath] = { start: currentStart, end: lineNum };
        currentPath = null;
      } else if (line.trim() === '</files>') {
        break;
      }
    }
  } else if (style === 'markdown') {
    const fileStarts: Array<{ path: string; line: number }> = [];
    const totalLines = countLines(output);

    for (const { line, lineNum } of iterLines(output)) {
      if (lineNum < sectionStartLine) continue;

      const match = line.match(/^## File: (.+)$/);
      if (match) {
        fileStarts.push({ path: match[1].trim(), line: lineNum });
      } else if (line.startsWith('# ') && lineNum > sectionStartLine) {
        // Hit the next top-level section — stop scanning
        break;
      }
    }

    for (let j = 0; j < fileStarts.length; j++) {
      const { path, line } = fileStarts[j];
      const endLine = j + 1 < fileStarts.length ? fileStarts[j + 1].line - 1 : totalLines;
      offsets[path] = { start: line, end: endLine };
    }
  } else if (style === 'plain') {
    // Plain format: "================" then "File: path" then "================" then content
    // End of content = line before next "================" separator
    // The short separator is exactly 16 '=' characters (matches PLAIN_SEPARATOR in plainStyle.ts)
    const SEPARATOR = '================';
    const fileHeaderLines: Array<{ path: string; line: number }> = [];
    const totalLines = countLines(output);
    let prevLine = '';

    for (const { line, lineNum } of iterLines(output)) {
      if (lineNum < sectionStartLine) {
        prevLine = line;
        continue;
      }

      if (prevLine === SEPARATOR && line.startsWith('File: ')) {
        const filePath = line.slice('File: '.length).trim();
        // lineNum - 1 is the separator line number
        fileHeaderLines.push({ path: filePath, line: lineNum - 1 });
      }
      prevLine = line;
    }

    for (let j = 0; j < fileHeaderLines.length; j++) {
      const { path, line } = fileHeaderLines[j];
      // Content starts after: separator → File: header → separator → content
      const contentStart = line + 3;
      // Content ends before the next file separator, or at the last line
      const nextSeparatorLine = j + 1 < fileHeaderLines.length ? fileHeaderLines[j + 1].line - 1 : totalLines;
      offsets[path] = { start: contentStart, end: nextSeparatorLine };
    }
  }

  return offsets;
};

/**
 * Formats a FileLineOffset as a human-readable annotation string.
 * Example: " [lines 42–78]"
 */
export const formatFileOffsetAnnotation = (offset: FileLineOffset): string => {
  return ` [lines ${offset.start}–${offset.end}]`;
};
