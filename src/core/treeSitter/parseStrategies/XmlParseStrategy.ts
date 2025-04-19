import type { SyntaxNode } from 'web-tree-sitter';
import type { ParseContext, ParseStrategy } from './ParseStrategy.js';

enum CaptureType {
  Comment = 'comment',
  Element = 'definition.element',
  StartTag = 'start_tag',
  SelfClosingTag = 'self_closing_tag',
  AttributeName = 'attribute.name',
  AttributeValue = 'attribute.value',
}

type ParseResult = {
  content: string | null;
  processedElements?: Set<string>;
};

export class XmlParseStrategy implements ParseStrategy {
  private nodeDepths = new Map<string, number>();

  parseCapture(capture: { node: SyntaxNode; name: string }, lines: string[], processedChunks: Set<string>, context: ParseContext): string | null {
    const { node, name } = capture;
    const captureTypes = this.getCaptureType(name);

    // Process start tags and self-closing tags
    if (captureTypes.has(CaptureType.StartTag) || captureTypes.has(CaptureType.SelfClosingTag)) {
      return this.parseElementTag(node, lines, processedChunks);
    }

    // Process elements (for tracking structure)
    if (captureTypes.has(CaptureType.Element)) {
      // Only focus on parent elements, as we'll process children separately
      if (node.parent && node.parent.type === 'document') {
        return this.parseElementStructure(node, lines, processedChunks);
      }
    }

    // Process comments
    if (captureTypes.has(CaptureType.Comment)) {
      const comment = this.getNodeText(node, lines);
      if (processedChunks.has(comment)) {
        return null;
      }
      processedChunks.add(comment);
      return comment;
    }

    return null;
  }

  private getCaptureType(name: string): Set<CaptureType> {
    const types = new Set<CaptureType>();
    for (const type of Object.values(CaptureType)) {
      if (name.includes(type)) {
        types.add(type);
      }
    }
    return types;
  }

  private parseElementTag(node: SyntaxNode, lines: string[], processedChunks: Set<string>): string | null {
    const tagName = this.getTagName(node);
    if (!tagName) {
      return null;
    }

    // Calculate depth based on parent nodes
    const depth = this.calculateDepth(node);
    this.nodeDepths.set(String(node.id), depth);

    // Create a representation with indentation
    const indent = depth > 0 ? '  '.repeat(depth) : '';
    // Note: Remove the closing '>' to match test expectations
    const tagRepresentation = `${indent}<${tagName}`;

    // Skip if we've seen this exact tag before
    if (processedChunks.has(tagRepresentation)) {
      return null;
    }
    processedChunks.add(tagRepresentation);

    return tagRepresentation;
  }

  private parseElementStructure(node: SyntaxNode, lines: string[], processedChunks: Set<string>): string | null {
    // Get element name from its start tag
    const startTagNode = node.childForFieldName('start_tag') || node.childForFieldName('self_closing_tag');
    if (!startTagNode) return null;

    const tagName = this.getTagName(startTagNode);
    if (!tagName) return null;

    // Create a simplified structural representation
    const depth = this.calculateDepth(node);
    const indent = depth > 0 ? '  '.repeat(depth) : '';
    // Note: Remove the closing tags to match test expectations
    const structure = `${indent}<${tagName}`;

    if (processedChunks.has(structure)) {
      return null;
    }
    processedChunks.add(structure);

    return structure;
  }

  private calculateDepth(node: SyntaxNode): number {
    // Start from current node
    let currentNode = node;
    let depth = 0;

    // Walk up the tree to find the document node
    while (currentNode.parent && currentNode.parent.type !== 'document') {
      // Only increment depth for element nodes
      if (currentNode.parent.type === 'element') {
        depth++;
      }
      currentNode = currentNode.parent;
    }

    return depth;
  }

  private getTagName(node: SyntaxNode): string | null {
    // In tree-sitter-xml, the tag name is the first named child of a start_tag or self_closing_tag
    const tagNameNode = node.childForFieldName('name');
    return tagNameNode ? tagNameNode.text : null;
  }

  private getNodeText(node: SyntaxNode, lines: string[]): string {
    const startRow = node.startPosition.row;
    const endRow = node.endPosition.row;
    return lines.slice(startRow, endRow + 1).join('\n').trim();
  }
}
