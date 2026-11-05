import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy, getNodeEndRow } from './BaseParseStrategy.js';

export class CssParseStrategy extends BaseParseStrategy {
  parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    _context: ParseContext,
  ): string | null {
    const { node, name } = capture;
    const startRow = node.startPosition.row;
    const endRow = node.endPosition.row;

    if (!this.validateLineExists(lines, startRow)) {
      return null;
    }

    // Process CSS-specific capture names
    const isCommentCapture = name.includes('comment');
    const isSelectorCapture = name.includes('selector') || name.includes('definition.selector');
    const isAtRuleCapture = name.includes('at_rule') || name.includes('definition.at_rule');

    const shouldSelect = isCommentCapture || isSelectorCapture || isAtRuleCapture;

    if (!shouldSelect) {
      return null;
    }

    // Extract all lines for comments, only the first line for others
    let selectedLines: string[];
    if (isCommentCapture) {
      selectedLines = lines.slice(startRow, endRow + 1);
    } else if (isAtRuleCapture && !isSelectorCapture) {
      // At-rules keep their prelude up to the block (e.g. a multi-line @media
      // query), or the whole statement when it has no block (e.g. @import)
      selectedLines = lines.slice(startRow, this.getAtRulePreludeEndRow(node) + 1);
    } else {
      // For selectors and at-rules, extract only the first line
      selectedLines = [lines[startRow]];
    }

    if (selectedLines.length < 1) {
      return null;
    }

    const chunk = selectedLines.join('\n');
    if (!this.checkAndAddToProcessed(chunk, processedChunks)) {
      return null;
    }

    return chunk;
  }

  private getAtRulePreludeEndRow(node: Node): number {
    const block = node.namedChildren.find((child) => child?.type === 'block' || child?.type === 'keyframe_block_list');
    return block ? block.startPosition.row : getNodeEndRow(node);
  }
}
