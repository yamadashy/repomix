export interface FileLineOffset {
  start: number;
  end: number;
}

/**
 * Scans a rendered output string and returns the line range (1-indexed, inclusive)
 * for each file's content block.
 *
 * Supports XML, Markdown, and plain text output styles.
 * JSON output is structured and does not use this function.
 */
export const computeFileLineOffsets = (output: string, style: string): Record<string, FileLineOffset> => {
  const offsets: Record<string, FileLineOffset> = {};
  const lines = output.split('\n');

  if (style === 'xml') {
    let currentPath: string | null = null;
    let currentStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const startMatch = line.match(/^<file path="(.+)">$/);
      if (startMatch) {
        currentPath = startMatch[1];
        currentStart = lineNum;
      } else if (line === '</file>' && currentPath !== null) {
        offsets[currentPath] = { start: currentStart, end: lineNum };
        currentPath = null;
      }
    }
  } else if (style === 'markdown') {
    const fileStarts: Array<{ path: string; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^## File: (.+)$/);
      if (match) {
        fileStarts.push({ path: match[1], line: i + 1 });
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
    const fileSeparatorLines: number[] = [];
    const fileHeaderLines: Array<{ path: string; line: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (line === SEPARATOR) {
        fileSeparatorLines.push(lineNum);
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
