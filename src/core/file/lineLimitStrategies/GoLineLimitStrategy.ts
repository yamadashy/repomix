import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryGo } from '../../treeSitter/queries/queryGo.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Go-specific line limiting strategy
 */
export class GoLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for package declarations
      const packageQuery = new Query(tree.language, queryGo);
      const packageMatches = packageQuery.matches(tree.rootNode);

      // Query for import declarations
      const importQuery = new Query(tree.language, queryGo);
      const importMatches = importQuery.matches(tree.rootNode);

      // Query for type declarations (signatures only)
      const typeQuery = new Query(tree.language, queryGo);
      const typeMatches = typeQuery.matches(tree.rootNode);

      // Query for function declarations (signatures only)
      const functionQuery = new Query(tree.language, queryGo);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations (signatures only)
      const methodQuery = new Query(tree.language, queryGo);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [...packageMatches, ...importMatches, ...typeMatches, ...functionMatches, ...methodMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For package and imports, include the full statement
          if (node.type === 'package_clause' || node.type === 'import_declaration' || node.type === 'import_spec') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For types, functions, and methods, only include the signature
          else if (
            node.type === 'type_declaration' ||
            node.type === 'function_declaration' ||
            node.type === 'method_declaration'
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
      // Query for function declarations
      const functionQuery = new Query(tree.language, queryGo);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations
      const methodQuery = new Query(tree.language, queryGo);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Process all function-like nodes
      [...functionMatches, ...methodMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          // Filter for function/method definitions
          if (capture.name.includes('definition.function') || capture.name.includes('definition.method')) {
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
      // Query for init functions
      const initQuery = new Query(tree.language, queryGo);
      const initMatches = initQuery.matches(tree.rootNode);

      // Query for main functions
      const mainQuery = new Query(tree.language, queryGo);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for variable declarations at package level
      const varQuery = new Query(tree.language, queryGo);
      const varMatches = varQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...initMatches, ...mainMatches, ...varMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main function
          if (node.type === 'function_declaration' && this.isMainFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for init function
          if (node.type === 'function_declaration' && this.isInitFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for package-level variable declarations in the last section
          if (node.type === 'var_declaration' || node.type === 'var_spec') {
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
      // Query for control structures that increase complexity
      const controlStructures = [
        'if_statement',
        'else_clause',
        'for_statement',
        'range_clause',
        'switch_statement',
        'expression_switch_statement',
        'type_switch_statement',
        'select_statement',
        'communication_clause',
        'case_clause',
        'default_clause',
        'go_statement',
        'defer_statement',
        'conditional_expression',
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryGo);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryGo);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for multiple return values
      const result = node.childForFieldName('result');
      if (result) {
        const resultCount = result.namedChildCount;
        complexity += Math.min(resultCount / 3, 0.5); // Max +0.5 for multiple returns
      }

      // Additional complexity for goroutines and channels
      const goQuery = new Query(node.tree.language, queryGo);
      const goMatches = goQuery.matches(node);
      complexity += goMatches.length * 0.5;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a type/function/method signature
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
    const nameNode = node.childForFieldName('name');
    if (nameNode && (nameNode.type === 'identifier' || nameNode.type === 'field_identifier')) {
      const line = lines[nameNode.startPosition.row];
      return line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
    }

    return 'anonymous';
  }

  /**
   * Check if function is main function
   */
  private isMainFunction(node: Node, lines: string[]): boolean {
    const nameNode = node.childForFieldName('name');
    if (nameNode && nameNode.type === 'identifier') {
      const line = lines[nameNode.startPosition.row];
      const name = line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
      return name === 'main';
    }

    return false;
  }

  /**
   * Check if function is init function
   */
  private isInitFunction(node: Node, lines: string[]): boolean {
    const nameNode = node.childForFieldName('name');
    if (nameNode && nameNode.type === 'identifier') {
      const line = lines[nameNode.startPosition.row];
      const name = line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
      return name === 'init';
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

      // Package declarations
      if (trimmed.startsWith('package ')) {
        headerLines.push(index);
      }

      // Import statements
      if (trimmed.startsWith('import ') || trimmed.startsWith('import (')) {
        headerLines.push(index);
      }

      // Type signatures (first line only)
      if (trimmed.startsWith('type ') && !trimmed.includes('{')) {
        headerLines.push(index);
      }

      // Function signatures (first line only)
      if ((trimmed.startsWith('func ') || trimmed.startsWith('func (')) && !trimmed.includes('{')) {
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
      const functionMatch = trimmed.match(/^func\s+(\w+)\s*\(/);
      if (functionMatch) {
        functions.push({
          name: functionMatch[1],
          startLine: index,
          endLine: index, // Simplified - would need block parsing
          complexity: 0.5,
          lineCount: 1,
          isSelected: false,
        });
      }

      // Method declarations
      const methodMatch = trimmed.match(/^func\s*\([^)]+\)\s*(\w+)\s*\(/);
      if (methodMatch) {
        functions.push({
          name: methodMatch[1],
          startLine: index,
          endLine: index,
          complexity: 0.5,
          lineCount: 1,
          isSelected: false,
        });
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
      if (trimmed.startsWith('func main')) {
        footerLines.push(index);
      }

      // Init function
      if (trimmed.startsWith('func init')) {
        footerLines.push(index);
      }

      // Package-level variables in the last section
      if (trimmed.startsWith('var ') && !trimmed.includes('(')) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
