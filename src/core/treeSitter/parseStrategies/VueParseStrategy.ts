import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy } from './BaseParseStrategy.js';

export class VueParseStrategy extends BaseParseStrategy {
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

    const chunk = selectedLines.join('\n');

    // Create a unique ID for this chunk
    const chunkId = `${name}:${startRow}`;
    if (processedChunks.has(chunkId)) {
      return null;
    }

    processedChunks.add(chunkId);
    return chunk;
  }
}
