import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryC } from '../../treeSitter/queries/queryC.js';
import { queryCpp } from '../../treeSitter/queries/queryCpp.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * C/C++-specific line limiting strategy
 */
export class CLineLimitStrategy implements LanguageStrategy {
  private isCpp: boolean;

  constructor(isCpp: boolean = false) {
    this.isCpp = isCpp;
  }

  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Use appropriate query based on language
      const query = this.isCpp ? queryCpp : queryC;

      // Query for include statements
      const includeQuery = new Query(tree.language, query);
      const includeMatches = includeQuery.matches(tree.rootNode);

      // Query for preprocessor directives
      const preprocessorQuery = new Query(tree.language, query);
      const preprocessorMatches = preprocessorQuery.matches(tree.rootNode);

      // Query for struct/class declarations (signatures only)
      const structQuery = new Query(tree.language, query);
      const structMatches = structQuery.matches(tree.rootNode);

      // Query for function declarations (signatures only)
      const functionQuery = new Query(tree.language, query);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [...includeMatches, ...preprocessorMatches, ...structMatches, ...functionMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For includes and preprocessor directives, include the full statement
          if (
            node.type === 'preproc_include' ||
            node.type === 'preproc_def' ||
            node.type === 'preproc_ifdef' ||
            node.type === 'preproc_ifndef' ||
            node.type === 'preproc_if' ||
            node.type === 'preproc_else' ||
            node.type === 'preproc_elif' ||
            node.type === 'preproc_endif'
          ) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For structs, classes, and functions, only include the signature
          else if (
            node.type === 'struct_specifier' ||
            (this.isCpp && node.type === 'class_specifier') ||
            node.type === 'function_declarator' ||
            node.type === 'declaration'
          ) {
            const signatureEnd = this.findSignatureEnd(node, lines);
            for (let i = node.startPosition.row; i <= signatureEnd && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
        });
      });
    } catch (error) {
      // If parsing fails, fall back to basic heuristics
      return this.identifyHeaderLinesHeuristic(lines);
    }

    return [...new Set(headerLines)].sort((a, b) => a - b);
  }

  analyzeFunctions(lines: string[], tree: Tree): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];

    try {
      // Use appropriate query based on language
      const query = this.isCpp ? queryCpp : queryC;

      // Query for function definitions
      const functionQuery = new Query(tree.language, query);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Process all function-like nodes
      functionMatches.forEach((match) => {
        match.captures.forEach((capture) => {
          // Filter for function definitions
          if (capture.name.includes('definition.function')) {
            const node = capture.node;
            const startLine = node.startPosition.row;
            const endLine = node.endPosition.row;

            // Extract function name
            const name = this.extractFunctionName(node, lines);

            // Calculate complexity
            const complexity = this.calculateComplexity(node);

            functions.push({
              name,
              startLine,
              endLine,
              complexity,
              lineCount: endLine - startLine + 1,
              isSelected: false,
            });
          }
        });
      });
    } catch (error) {
      // If parsing fails, fall back to basic heuristics
      return this.analyzeFunctionsHeuristic(lines);
    }

    return functions;
  }

  identifyFooterLines(lines: string[], tree: Tree): number[] {
    const footerLines: number[] = [];

    try {
      // Use appropriate query based on language
      const query = this.isCpp ? queryCpp : queryC;

      // Query for main function
      const mainQuery = new Query(tree.language, query);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for global variable declarations
      const varQuery = new Query(tree.language, query);
      const varMatches = varQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...varMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main function
          if (this.isMainFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for global variable declarations in the last section
          if (node.type === 'declaration' || node.type === 'field_declaration') {
            const lineThreshold = Math.floor(lines.length * 0.8);
            if (node.startPosition.row >= lineThreshold) {
              for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
                footerLines.push(i);
              }
            }
          }
        });
      });
    } catch (error) {
      // If parsing fails, fall back to basic heuristics
      return this.identifyFooterLinesHeuristic(lines);
    }

    return [...new Set(footerLines)].sort((a, b) => a - b);
  }

  calculateComplexity(node: Node): number {
    let complexity = 1; // Base complexity

    try {
      // Use appropriate query based on language
      const query = this.isCpp ? queryCpp : queryC;

      // Query for control structures that increase complexity
      const controlStructures = [
        'if_statement',
        'else_clause',
        'while_statement',
        'for_statement',
        'do_statement',
        'switch_statement',
        'case_statement',
        'goto_statement',
        'conditional_expression',
        'binary_expression', // Logical operators
      ];

      // Add C++ specific structures
      if (this.isCpp) {
        controlStructures.push('try_statement', 'catch_clause', 'throw_statement', 'template_declaration');
      }

      controlStructures.forEach((structure) => {
        const structQuery = new Query(node.tree.language, query);
        const matches = structQuery.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, query);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for pointers and references (C++)
      if (this.isCpp) {
        const pointerQuery = new Query(node.tree.language, query);
        const pointerMatches = pointerQuery.matches(node);
        complexity += pointerMatches.length * 0.2;
      }
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a struct/class/function signature
   */
  private findSignatureEnd(node: Node, lines: string[]): number {
    const startLine = node.startPosition.row;

    for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.includes('{') || line.endsWith(';')) {
        return i;
      }
    }

    return startLine;
  }

  /**
   * Extract function name from node
   */
  private extractFunctionName(node: Node, lines: string[]): string {
    // Try to get name from identifier
    const nameNode = node.childForFieldName('declarator');
    if (nameNode) {
      const identifierNode = nameNode.childForFieldName('declarator');
      if (identifierNode && (identifierNode.type === 'identifier' || identifierNode.type === 'field_identifier')) {
        const line = lines[identifierNode.startPosition.row];
        return line.substring(identifierNode.startPosition.column, identifierNode.endPosition.column).trim();
      }
    }

    return 'anonymous';
  }

  /**
   * Check if function is main function
   */
  private isMainFunction(node: Node, lines: string[]): boolean {
    const nameNode = node.childForFieldName('declarator');
    if (nameNode) {
      const identifierNode = nameNode.childForFieldName('declarator');
      if (identifierNode && (identifierNode.type === 'identifier' || identifierNode.type === 'field_identifier')) {
        const line = lines[identifierNode.startPosition.row];
        const name = line.substring(identifierNode.startPosition.column, identifierNode.endPosition.column).trim();

        // Check if it's the main function (int main or void main)
        if (name === 'main') {
          const functionLine = lines[node.startPosition.row];
          return functionLine.includes('int main') || functionLine.includes('void main');
        }
      }
    }

    return false;
  }

  /**
   * Fallback heuristic for header identification
   */
  private identifyHeaderLinesHeuristic(lines: string[]): number[] {
    const headerLines: number[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Include statements
      if (trimmed.startsWith('#include') || trimmed.startsWith('#include_next')) {
        headerLines.push(index);
      }

      // Preprocessor directives
      if (trimmed.startsWith('#') && !trimmed.startsWith('#include')) {
        headerLines.push(index);
      }

      // Struct/class signatures (first line only)
      if (
        (trimmed.startsWith('struct ') || trimmed.startsWith('class ') || trimmed.startsWith('union ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Function signatures (first line only)
      if (
        trimmed.includes('(') &&
        trimmed.includes(')') &&
        (trimmed.includes('int ') ||
          trimmed.includes('void ') ||
          trimmed.includes('char ') ||
          trimmed.includes('float ') ||
          trimmed.includes('double ') ||
          trimmed.includes('bool ') ||
          (this.isCpp && (trimmed.includes('string ') || trimmed.includes('auto ')))) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }
    });

    return headerLines;
  }

  /**
   * Fallback heuristic for function analysis
   */
  private analyzeFunctionsHeuristic(lines: string[]): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Function declarations
      const functionMatch = trimmed.match(/^(\w+(?:\s*\*)*)\s+(\w+)\s*\([^)]*\)\s*(?:;|\{)/);
      if (functionMatch) {
        const functionName = functionMatch[2];

        // Skip if it looks like a variable declaration
        if (!functionMatch[1].includes('*') || functionMatch[2] !== 'main') {
          functions.push({
            name: functionName,
            startLine: index,
            endLine: index, // Simplified - would need block parsing
            complexity: 0.5,
            lineCount: 1,
            isSelected: false,
          });
        }
      }
    });

    return functions;
  }

  /**
   * Fallback heuristic for footer identification
   */
  private identifyFooterLinesHeuristic(lines: string[]): number[] {
    const footerLines: number[] = [];
    const lineThreshold = Math.floor(lines.length * 0.8);

    lines.forEach((line, index) => {
      if (index < lineThreshold) return; // Only look at last 20%

      const trimmed = line.trim();

      // Main function
      if ((trimmed.includes('int main') || trimmed.includes('void main')) && trimmed.includes('(')) {
        footerLines.push(index);
      }

      // Global variables in the last section
      if (
        (trimmed.includes('int ') ||
          trimmed.includes('char ') ||
          trimmed.includes('float ') ||
          trimmed.includes('double ') ||
          (this.isCpp && (trimmed.includes('string ') || trimmed.includes('auto ')))) &&
        !trimmed.includes('(') &&
        !trimmed.startsWith('{') &&
        trimmed.endsWith(';')
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
