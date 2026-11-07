import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy, getNodeEndRow } from './BaseParseStrategy.js';

export class DefaultParseStrategy extends BaseParseStrategy {
  parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    _context: ParseContext,
  ): string | null {
    const { node, name } = capture;
    const startRow = node.startPosition.row;
    const isNameCapture = name.includes('name');
    const isCommentCapture = name.includes('comment');
    const nodeEndRow = getNodeEndRow(node);
    const endRow = isCommentCapture ? this.getCommentEndRow(lines, startRow, nodeEndRow) : nodeEndRow;

    // A capture starting inside a multi-line chunk already emitted (e.g. a
    // comment inside a multi-line field declaration, or code the grammar found
    // inside an extended Ruby comment) would repeat those lines
    if (processedChunks.has(`default:covered-row:${startRow}`)) {
      return null;
    }

    const selectedLines = this.extractLines(lines, startRow, endRow);
    if (!selectedLines) {
      return null;
    }

    const isImportCapture = name.includes('import') || name.includes('require');
    const shouldSelect = isNameCapture || isCommentCapture || isImportCapture;

    if (!shouldSelect) {
      return null;
    }

    // Dedupe by source position, not by text: two captures of the same lines
    // (e.g. a name and its definition) are duplicates, but an identical line
    // elsewhere in the file (the same method signature or doc comment in
    // another class) is a separate declaration and must be kept.
    const positionKey = `default:${startRow}:${endRow}`;
    if (processedChunks.has(positionKey)) {
      return null;
    }
    processedChunks.add(positionKey);

    // Captures are processed in start-row order, so marking the rows after the
    // first one suppresses later captures that start inside this chunk
    for (let row = startRow + 1; row <= endRow; row++) {
      processedChunks.add(`default:covered-row:${row}`);
    }

    return selectedLines.join('\n');
  }

  /**
   * tree-sitter-ruby ends a `=begin` block comment at the first "=end" it sees,
   * even mid-line (e.g. "using =begin/=end syntax"), and parses the real
   * closing "=end" line as code. Extend such a comment to its closing line so
   * the block is emitted whole.
   */
  private getCommentEndRow(lines: string[], startRow: number, endRow: number): number {
    if (!lines[startRow]?.trimStart().startsWith('=begin') || /^\s*=end\b/.test(lines[endRow] ?? '')) {
      return endRow;
    }
    for (let row = endRow + 1; row < lines.length; row++) {
      if (/^\s*=end\b/.test(lines[row])) {
        return row;
      }
    }
    return endRow;
  }
}
