export interface FileLineOffset {
  start: number;
  end: number;
}

/**
 * Finds the 1-indexed line number where the files section starts in the output.
 * Restricting offset scanning to this section prevents false matches when a file's
 * own content contains marker strings (e.g., a file that itself contains XML tags
 * or Markdown headings matching our patterns).
 */
const findFilesSectionStart = (lines: string[], style: string): number => {
  if (style === 'xml') {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '<files>') return i;
    }
  } else if (style === 'markdown') {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '# Files') return i;
    }
  } else if (style === 'plain') {
    // Plain format: long separator (64 =) followed by "Files" line
    const LONG_SEPARATOR = '='.repeat(64);
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] === LONG_SEPARATOR && lines[i + 1] === 'Files') return i;
    }
  }
  return 0; // fallback: scan entire output
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
 */
export const computeFileLineOffsets = (output: string, style: string): Record<string, FileLineOffset> => {
  const offsets: Record<string, FileLineOffset> = {};
  const lines = output.split('\n');

  const sectionStart = findFilesSectionStart(lines, style);

  if (style === 'xml') {
    let currentPath: string | null = null;
    let currentStart = 0;

    for (let i = sectionStart; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const startMatch = line.match(/^<file path="(.+)">$/);
      if (startMatch) {
        currentPath = startMatch[1];
        currentStart = lineNum;
      } else if (line === '</file>' && currentPath !== null) {
        offsets[currentPath] = { start: currentStart, end: lineNum };
        currentPath = null;
      } else if (line === '</files>') {
        break;
      }
    }
  } else if (style === 'markdown') {
    const fileStarts: Array<{ path: string; line: number }> = [];

    for (let i = sectionStart; i < lines.length; i++) {
      const match = lines[i].match(/^## File: (.+)$/);
      if (match) {
        fileStarts.push({ path: match[1], line: i + 1 });
      } else if (lines[i].startsWith('# ') && i > sectionStart) {
        // Hit the next top-level section — stop scanning
        break;
      }
    }

    for (let j = 0; j < fileStarts.length; j++) {
      const { path, line } = fileStarts[j];
      const endLine = j + 1 < fileStarts.length ? fileStarts[j + 1].line - 1 : lines.length;
      offsets[path] = { start: line, end: endLine };
    }
  } else if (style === 'plain') {
    // Plain format: "================" then "File: path" then "================" then content
    // End of content = line before next "================" separator
    const SEPARATOR = '================';
    const fileHeaderLines: Array<{ path: string; line: number }> = [];

    for (let i = sectionStart; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (line === SEPARATOR) {
        // Check if next line is a File: header
        if (i + 1 < lines.length && lines[i + 1].startsWith('File: ')) {
          const filePath = lines[i + 1].slice('File: '.length);
          fileHeaderLines.push({ path: filePath, line: lineNum });
        }
      }
    }

    for (let j = 0; j < fileHeaderLines.length; j++) {
      const { path, line } = fileHeaderLines[j];
      // Content starts after: separator → File: header → separator → content
      const contentStart = line + 3;
      // Content ends before the next file separator, or at the last line
      const nextSeparatorLine = j + 1 < fileHeaderLines.length ? fileHeaderLines[j + 1].line - 1 : lines.length;
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
