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
      selectedLines = this.getAtRulePreludeLines(node, lines, startRow);
    } else {
      // For selectors and at-rules, extract only the first line
      selectedLines = [lines[startRow]];
    }

    if (selectedLines.length < 1) {
      return null;
    }

    // Dedupe by source position, not by text: identical rules or at-rules in
    // different places of the stylesheet are separate declarations
    const positionKey = `css:${node.startIndex}:${node.endIndex}`;
    if (processedChunks.has(positionKey)) {
      return null;
    }
    processedChunks.add(positionKey);

    return selectedLines.join('\n');
  }

  private getAtRulePreludeLines(node: Node, lines: string[], startRow: number): string[] {
    const block = node.namedChildren.find((child) => child?.type === 'block' || child?.type === 'keyframe_block_list');
    // Stop right after the opening brace (or at the end of a blockless
    // statement) so rules on the same row are not repeated here; they are
    // emitted by their own selector captures. Positions come from the AST, so a
    // "{" inside a string in the prelude does not cut it short.
    let endRow: number;
    let endColumn: number | undefined;
    if (block) {
      endRow = block.startPosition.row;
      endColumn = block.startPosition.column + 1;
    } else {
      endRow = getNodeEndRow(node);
      endColumn = endRow === node.endPosition.row ? node.endPosition.column : undefined;
    }

    const preludeLines = lines.slice(startRow, endRow + 1);
    const lastIndex = preludeLines.length - 1;
    preludeLines[lastIndex] = preludeLines[lastIndex].slice(0, endColumn);
    return preludeLines;
  }
}
