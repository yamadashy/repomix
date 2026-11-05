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
    const endRow = getNodeEndRow(node);

    const selectedLines = this.extractLines(lines, startRow, endRow);
    if (!selectedLines) {
      return null;
    }

    const isNameCapture = name.includes('name');
    const isCommentCapture = name.includes('comment');
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

    return selectedLines.join('\n');
  }
}
