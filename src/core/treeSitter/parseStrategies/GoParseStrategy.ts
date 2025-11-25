import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy, type ParseResult } from './BaseParseStrategy.js';

enum CaptureType {
  Comment = 'comment',
  Type = 'definition.type',
  Interface = 'definition.interface',
  Struct = 'definition.struct',
  Package = 'definition.package',
  Import = 'definition.import',
  Function = 'definition.function',
  Method = 'definition.method',
  Module = 'definition.module',
  Variable = 'definition.variable',
  Constant = 'definition.constant',
}

export class GoParseStrategy extends BaseParseStrategy {
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

    // Comments
    if (captureTypes.has(CaptureType.Comment)) {
      return this.parseBlockDeclaration(lines, startRow, endRow, processedChunks).content;
    }

    // Package declarations
    if (captureTypes.has(CaptureType.Package) || captureTypes.has(CaptureType.Module)) {
      return this.parseSimpleDeclaration(lines, startRow, processedChunks).content;
    }

    // Import declarations
    if (captureTypes.has(CaptureType.Import)) {
      return lines[startRow].includes('(')
        ? this.parseBlockDeclaration(lines, startRow, endRow, processedChunks).content
        : this.parseSimpleDeclaration(lines, startRow, processedChunks).content;
    }

    // Variable declarations
    if (captureTypes.has(CaptureType.Variable)) {
      return this.parseBlockDeclaration(lines, startRow, endRow, processedChunks).content;
    }

    // Constant declarations
    if (captureTypes.has(CaptureType.Constant)) {
      return this.parseBlockDeclaration(lines, startRow, endRow, processedChunks).content;
    }

    // Type definitions
    if (
      captureTypes.has(CaptureType.Type) ||
      captureTypes.has(CaptureType.Interface) ||
      captureTypes.has(CaptureType.Struct)
    ) {
      return this.parseTypeDefinition(lines, startRow, endRow, processedChunks).content;
    }

    // Function declarations
    if (captureTypes.has(CaptureType.Function)) {
      return this.parseFunctionOrMethod(lines, startRow, endRow, processedChunks, false).content;
    }

    // Method declarations
    if (captureTypes.has(CaptureType.Method)) {
      return this.parseFunctionOrMethod(lines, startRow, endRow, processedChunks, true).content;
    }

    return null;
  }

  private getFunctionName(lines: string[], startRow: number): string | null {
    const line = lines[startRow];
    // "func funcName(" pattern detection
    const match = line.match(/func\s+([A-Za-z0-9_]+)\s*\(/);
    if (match?.[1]) {
      return match[1];
    }
    return null;
  }

  // Helper to get method name including receiver type
  private getMethodWithReceiver(lines: string[], startRow: number): string | null {
    const line = lines[startRow];
    // "func (r ReceiverType) methodName(" pattern detection
    const match = line.match(/func\s+\(([^)]+)\)\s+([A-Za-z0-9_]+)\s*\(/);
    if (match?.[2]) {
      return match[2];
    }
    return null;
  }

  private findClosingToken(
    lines: string[],
    startRow: number,
    endRow: number,
    _openToken: string,
    closeToken: string,
  ): number {
    for (let i = startRow; i <= endRow; i++) {
      if (lines[i].includes(closeToken)) {
        return i;
      }
    }
    return startRow;
  }

  private parseSimpleDeclaration(lines: string[], startRow: number, processedChunks: Set<string>): ParseResult {
    const declaration = lines[startRow].trim();
    if (!this.checkAndAddToProcessed(declaration, processedChunks)) {
      return this.createNullResult();
    }
    return this.createResult(declaration);
  }

  private parseBlockDeclaration(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
  ): ParseResult {
    const blockEndRow = lines[startRow].includes('(')
      ? this.findClosingToken(lines, startRow, endRow, '(', ')')
      : endRow;

    const declaration = lines.slice(startRow, blockEndRow + 1).join('\n');
    if (!this.checkAndAddToProcessed(declaration, processedChunks)) {
      return this.createNullResult();
    }
    return this.createResult(declaration);
  }

  private parseFunctionOrMethod(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
    isMethod: boolean,
  ): ParseResult {
    const nameKey = isMethod ? 'method' : 'func';
    const getName = isMethod ? this.getMethodWithReceiver : this.getFunctionName;
    const name = getName.call(this, lines, startRow);

    if (name && processedChunks.has(`${nameKey}:${name}`)) {
      return this.createNullResult();
    }

    const signatureEndRow = this.findClosingToken(lines, startRow, endRow, '{', '{');
    const signature = lines
      .slice(startRow, signatureEndRow + 1)
      .join('\n')
      .trim();
    const cleanSignature = signature.split('{')[0].trim();

    if (!this.checkAndAddToProcessed(cleanSignature, processedChunks)) {
      return this.createNullResult();
    }

    if (name) {
      processedChunks.add(`${nameKey}:${name}`);
    }
    return this.createResult(cleanSignature);
  }

  private parseTypeDefinition(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
  ): ParseResult {
    const signatureEndRow = lines[startRow].includes('{')
      ? this.findClosingToken(lines, startRow, endRow, '{', '}')
      : endRow;

    const definition = lines.slice(startRow, signatureEndRow + 1).join('\n');
    if (!this.checkAndAddToProcessed(definition, processedChunks)) {
      return this.createNullResult();
    }
    return this.createResult(definition);
  }
}
