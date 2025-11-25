import type { Node } from 'web-tree-sitter';
import type { ParseContext } from './BaseParseStrategy.js';
import { BaseParseStrategy, type ParseResult } from './BaseParseStrategy.js';

enum CaptureType {
  Comment = 'comment',
  Interface = 'definition.interface',
  Type = 'definition.type',
  Enum = 'definition.enum',
  Class = 'definition.class',
  Import = 'definition.import',
  Function = 'definition.function',
  Method = 'definition.method',
  Property = 'definition.property',
}

export class TypeScriptParseStrategy extends BaseParseStrategy {
  private static readonly FUNCTION_NAME_PATTERN = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=/;

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

    // Function capture
    if (captureTypes.has(CaptureType.Function) || captureTypes.has(CaptureType.Method)) {
      return this.parseFunctionDefinition(lines, startRow, endRow, processedChunks).content;
    }

    // Class capture
    if (captureTypes.has(CaptureType.Class)) {
      return this.parseClassDefinition(lines, startRow, endRow, processedChunks).content;
    }

    // Type definition or import capture
    if (
      captureTypes.has(CaptureType.Interface) ||
      captureTypes.has(CaptureType.Type) ||
      captureTypes.has(CaptureType.Enum) ||
      captureTypes.has(CaptureType.Import)
    ) {
      return this.parseTypeOrImport(lines, startRow, endRow, processedChunks).content;
    }

    // Comment capture
    if (captureTypes.has(CaptureType.Comment)) {
      return lines
        .slice(startRow, endRow + 1)
        .join('\n')
        .trim();
    }

    return null;
  }

  private getFunctionName(lines: string[], startRow: number): string | null {
    const line = lines[startRow];
    const match = line.match(TypeScriptParseStrategy.FUNCTION_NAME_PATTERN);
    return match?.[1] ?? null;
  }

  private parseFunctionDefinition(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
  ): ParseResult {
    const functionName = this.getFunctionName(lines, startRow);
    if (functionName && processedChunks.has(`func:${functionName}`)) {
      return this.createNullResult();
    }

    const signatureEndRow = this.findSignatureEnd(lines, startRow, endRow);
    const selectedLines = lines.slice(startRow, signatureEndRow + 1);
    const cleanedSignature = this.cleanFunctionSignature(selectedLines);

    if (!this.checkAndAddToProcessed(cleanedSignature, processedChunks)) {
      return this.createNullResult();
    }

    if (functionName) {
      processedChunks.add(`func:${functionName}`);
    }

    return this.createResult(cleanedSignature);
  }

  private findSignatureEnd(lines: string[], startRow: number, endRow: number): number {
    for (let i = startRow; i <= endRow; i++) {
      const line = lines[i].trim();
      if (line.includes(')') && (line.endsWith('{') || line.endsWith('=>') || line.endsWith(';'))) {
        return i;
      }
    }
    return startRow;
  }

  private cleanFunctionSignature(lines: string[]): string {
    const result = [...lines];
    const lastLineIndex = result.length - 1;
    const lastLine = result[lastLineIndex];

    if (lastLine) {
      if (lastLine.includes('{')) {
        result[lastLineIndex] = lastLine.substring(0, lastLine.indexOf('{')).trim();
      } else if (lastLine.includes('=>')) {
        result[lastLineIndex] = lastLine.substring(0, lastLine.indexOf('=>')).trim();
      }
    }

    return result.join('\n').trim();
  }

  private parseClassDefinition(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
  ): ParseResult {
    const selectedLines = [lines[startRow]];

    if (startRow + 1 <= endRow) {
      const nextLine = lines[startRow + 1].trim();
      if (nextLine.includes('extends') || nextLine.includes('implements')) {
        selectedLines.push(nextLine);
      }
    }

    const cleanedLines = selectedLines.map((line) => line.replace(/\{.*$/, '').trim());
    const definition = cleanedLines.join('\n').trim();

    if (!this.checkAndAddToProcessed(definition, processedChunks)) {
      return this.createNullResult();
    }

    return this.createResult(definition);
  }

  private parseTypeOrImport(
    lines: string[],
    startRow: number,
    endRow: number,
    processedChunks: Set<string>,
  ): ParseResult {
    const selectedLines = lines.slice(startRow, endRow + 1);
    const definition = selectedLines.join('\n').trim();

    if (!this.checkAndAddToProcessed(definition, processedChunks)) {
      return this.createNullResult();
    }

    return this.createResult(definition);
  }
}
