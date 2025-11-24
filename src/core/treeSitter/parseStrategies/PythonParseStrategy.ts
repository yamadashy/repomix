import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy, type ParseResult } from './BaseParseStrategy.js';

enum CaptureType {
  Comment = 'comment',
  Class = 'definition.class',
  Function = 'definition.function',
  Docstring = 'docstring',
  TypeAlias = 'definition.type_alias',
}

export class PythonParseStrategy extends BaseParseStrategy {
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

    const captureTypes = this.getCaptureTypes(name, CaptureType);

    // Class definition
    if (captureTypes.has(CaptureType.Class)) {
      return this.parseClassDefinition(lines, startRow, processedChunks).content;
    }

    // Function definition
    if (captureTypes.has(CaptureType.Function)) {
      return this.parseFunctionDefinition(lines, startRow, processedChunks).content;
    }

    // Docstring
    if (captureTypes.has(CaptureType.Docstring)) {
      return this.parseDocstringOrComment(lines, startRow, endRow, processedChunks).content;
    }

    // Comment
    if (captureTypes.has(CaptureType.Comment)) {
      return this.parseDocstringOrComment(lines, startRow, endRow, processedChunks).content;
    }

    // Type alias
    if (captureTypes.has(CaptureType.TypeAlias)) {
      return this.parseTypeAlias(lines, startRow, processedChunks).content;
    }

    return null;
  }

  private getDecorators(lines: string[], startRow: number): string[] {
    const decorators: string[] = [];
    let currentRow = startRow - 1;

    while (currentRow >= 0) {
      const line = lines[currentRow].trim();
      if (line.startsWith('@')) {
        decorators.unshift(line); // Add to beginning to maintain order
      } else {
        break;
      }
      currentRow--;
    }

    return decorators;
  }

  private getClassInheritance(lines: string[], startRow: number): string | null {
    const line = lines[startRow];
    const match = line.match(/class\s+\w+\s*\((.*?)\):/);
    return match ? line.replace(/:\s*$/, '') : line.replace(/:\s*$/, '');
  }

  private getFunctionSignature(lines: string[], startRow: number): string | null {
    const line = lines[startRow];
    const match = line.match(/def\s+(\w+)\s*\((.*?)\)(\s*->\s*[^:]+)?:/);
    if (!match) return null;
    return line.replace(/:\s*$/, '');
  }

  private parseClassDefinition(lines: string[], startRow: number, processedChunks: Set<string>): ParseResult {
    const decorators = this.getDecorators(lines, startRow);
    const classDefinition = this.getClassInheritance(lines, startRow);
    const fullDefinition = [...decorators, classDefinition].join('\n');

    if (!this.checkAndAddToProcessed(fullDefinition, processedChunks)) {
      return this.createNullResult();
    }

    return this.createResult(fullDefinition);
  }

  private parseFunctionDefinition(lines: string[], startRow: number, processedChunks: Set<string>): ParseResult {
    const decorators = this.getDecorators(lines, startRow);
    const signature = this.getFunctionSignature(lines, startRow);

    if (!signature) {
      return this.createNullResult();
    }

    const fullDefinition = [...decorators, signature].join('\n');
    if (!this.checkAndAddToProcessed(fullDefinition, processedChunks)) {
      return this.createNullResult();
    }

    return this.createResult(fullDefinition);
  }

  private parseDocstringOrComment(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
  ): ParseResult {
    const content = lines.slice(startRow, endRow + 1).join('\n');

    if (!this.checkAndAddToProcessed(content, processedChunks)) {
      return this.createNullResult();
    }

    return this.createResult(content);
  }

  private parseTypeAlias(lines: string[], startRow: number, processedChunks: Set<string>): ParseResult {
    const typeAlias = lines[startRow].trim();

    if (!this.checkAndAddToProcessed(typeAlias, processedChunks)) {
      return this.createNullResult();
    }

    return this.createResult(typeAlias);
  }
}
