import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy } from './BaseParseStrategy.js';

export class DefaultParseStrategy extends BaseParseStrategy {
  parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    _context: ParseContext,
  ): string | null {
    const { node, name } = capture;
    const startRow = node.startPosition.row;
    const endRow = node.endPosition.row;

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

    const chunk = selectedLines.join('\n');
    if (!this.checkAndAddToProcessed(chunk, processedChunks)) {
      return null;
    }

    return chunk;
  }
}
