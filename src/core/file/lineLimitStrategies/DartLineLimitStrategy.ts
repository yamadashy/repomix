import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryDart } from '../../treeSitter/queries/queryDart.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Dart-specific line limiting strategy
 */
export class DartLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for import/export statements
      const importQuery = new Query(tree.language, queryDart);
      const importMatches = importQuery.matches(tree.rootNode);

      // Query for library declarations
      const libraryQuery = new Query(tree.language, queryDart);
      const libraryMatches = libraryQuery.matches(tree.rootNode);

      // Query for class declarations (signatures only)
      const classQuery = new Query(tree.language, queryDart);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for enum declarations (signatures only)
      const enumQuery = new Query(tree.language, queryDart);
      const enumMatches = enumQuery.matches(tree.rootNode);

      // Query for extension declarations (signatures only)
      const extensionQuery = new Query(tree.language, queryDart);
      const extensionMatches = extensionQuery.matches(tree.rootNode);

      // Query for function signatures (signatures only)
      const functionQuery = new Query(tree.language, queryDart);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method signatures (signatures only)
      const methodQuery = new Query(tree.language, queryDart);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [
        ...importMatches,
        ...libraryMatches,
        ...classMatches,
        ...enumMatches,
        ...extensionMatches,
        ...functionMatches,
        ...methodMatches,
      ].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For imports/exports and library, include the full statement
          if (node.type === 'import_or_export' || node.type === 'library_directive') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For classes, enums, extensions, functions, and methods, only include the signature
          else if (
            node.type === 'class_definition' ||
            node.type === 'enum_declaration' ||
            node.type === 'extension_declaration' ||
            node.type === 'function_signature' ||
            node.type === 'method_signature'
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
      const functionQuery = new Query(tree.language, queryDart);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations
      const methodQuery = new Query(tree.language, queryDart);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Query for constructor declarations
      const constructorQuery = new Query(tree.language, queryDart);
      const constructorMatches = constructorQuery.matches(tree.rootNode);

      // Process all function-like nodes
      [...functionMatches, ...methodMatches, ...constructorMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          // Filter for function/method/constructor definitions
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
      // Query for main function
      const mainQuery = new Query(tree.language, queryDart);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for top-level code
      const topLevelQuery = new Query(tree.language, queryDart);
      const topLevelMatches = topLevelQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...topLevelMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main function
          if (node.type === 'function_signature' && this.isMainFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for top-level code in the last section
          if (node.type === 'expression_statement' || node.type === 'assignment_expression') {
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
        'while_statement',
        'do_statement',
        'for_statement',
        'switch_statement',
        'case_clause',
        'default_clause',
        'try_statement',
        'catch_clause',
        'finally_clause',
        'conditional_expression',
        'binary_expression', // Logical operators
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryDart);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryDart);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for optional parameters and named parameters
      const optionalQuery = new Query(node.tree.language, queryDart);
      const optionalMatches = optionalQuery.matches(node);
      complexity += optionalMatches.length * 0.3;

      // Additional complexity for async/await
      const asyncQuery = new Query(node.tree.language, queryDart);
      const asyncMatches = asyncQuery.matches(node);
      complexity += asyncMatches.length * 0.4;

      // Additional complexity for generics
      const genericQuery = new Query(node.tree.language, queryDart);
      const genericMatches = genericQuery.matches(node);
      complexity += genericMatches.length * 0.2;

      // Additional complexity for mixins
      const mixinQuery = new Query(node.tree.language, queryDart);
      const mixinMatches = mixinQuery.matches(node);
      complexity += mixinMatches.length * 0.3;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a class/enum/extension/function/method signature
   */
  private findSignatureEnd(node: Node, lines: string[]): number {
    const startLine = node.startPosition.row;

    for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.includes('{') || line.includes('=>') || line.endsWith(';')) {
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
    if (nameNode && nameNode.type === 'identifier') {
      const line = lines[nameNode.startPosition.row];
      return line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
    }

    // For constructors, use class name
    if (node.type === 'method_signature') {
      const constructorNode = node.childForFieldName('constructor_signature');
      if (constructorNode) {
        return 'constructor';
      }
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
   * Fallback heuristic for header identification
   */
  private identifyHeaderLinesHeuristic(lines: string[]): number[] {
    const headerLines: number[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Library declarations
      if (trimmed.startsWith('library ')) {
        headerLines.push(index);
      }

      // Import/export statements
      if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
        headerLines.push(index);
      }

      // Class/enum/extension signatures (first line only)
      if (
        (trimmed.startsWith('class ') ||
          trimmed.startsWith('enum ') ||
          trimmed.startsWith('extension ') ||
          trimmed.startsWith('abstract class ') ||
          trimmed.startsWith('mixin class ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Function/method signatures (first line only)
      if (
        (trimmed.includes('void ') ||
          trimmed.includes('dynamic ') ||
          trimmed.includes('int ') ||
          trimmed.includes('String ') ||
          trimmed.includes('bool ') ||
          trimmed.includes('List ')) &&
        trimmed.includes('(') &&
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
      const functionMatch = trimmed.match(/^(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/);
      if (functionMatch) {
        const returnType = functionMatch[1];
        const functionName = functionMatch[2];

        functions.push({
          name: functionName,
          startLine: index,
          endLine: index, // Simplified - would need block parsing
          complexity: 0.5,
          lineCount: 1,
          isSelected: false,
        });
      }

      // Method declarations
      const methodMatch = trimmed.match(/^\s*(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/);
      if (methodMatch) {
        functions.push({
          name: methodMatch[2],
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
      if (trimmed.includes('void main') || trimmed.includes('dynamic main')) {
        footerLines.push(index);
      }

      // Top-level code in the last section
      if (
        !trimmed.startsWith('class ') &&
        !trimmed.startsWith('enum ') &&
        !trimmed.startsWith('extension ') &&
        !trimmed.startsWith('mixin ') &&
        !trimmed.startsWith('library ') &&
        !trimmed.startsWith('import ') &&
        !trimmed.startsWith('export ') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        trimmed.length > 0
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
