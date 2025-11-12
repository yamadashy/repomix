import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryTypescript } from '../../treeSitter/queries/queryTypescript.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * TypeScript-specific line limiting strategy
 */
export class TypeScriptLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for import statements
      const importQuery = new Query(tree.language, queryTypescript);
      const importMatches = importQuery.matches(tree.rootNode);

      // Query for type definitions
      const typeQuery = new Query(tree.language, queryTypescript);
      const typeMatches = typeQuery.matches(tree.rootNode);

      // Query for interface definitions
      const interfaceQuery = new Query(tree.language, queryTypescript);
      const interfaceMatches = interfaceQuery.matches(tree.rootNode);

      // Query for class definitions (signatures only)
      const classQuery = new Query(tree.language, queryTypescript);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for function signatures (declarations only)
      const functionQuery = new Query(tree.language, queryTypescript);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [...importMatches, ...typeMatches, ...interfaceMatches, ...classMatches, ...functionMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For classes and functions, only include the signature
          if (node.type === 'class_declaration' || node.type === 'function_declaration') {
            const signatureEnd = this.findSignatureEnd(node, lines);
            for (let i = node.startPosition.row; i <= signatureEnd && i < lines.length; i++) {
              headerLines.push(i);
            }
          } else {
            // For imports, types, and interfaces, include the full definition
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
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
      const functionQuery = new Query(tree.language, queryTypescript);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations
      const methodQuery = new Query(tree.language, queryTypescript);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Query for arrow functions
      const arrowFunctionQuery = new Query(tree.language, queryTypescript);
      const arrowFunctionMatches = arrowFunctionQuery.matches(tree.rootNode);

      // Process all function-like nodes
      [...functionMatches, ...methodMatches, ...arrowFunctionMatches].forEach((match) => {
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
      // Query for export statements
      const exportQuery = new Query(tree.language, queryTypescript);
      const exportMatches = exportQuery.matches(tree.rootNode);

      // Query for event listeners
      const eventListenerQuery = new Query(tree.language, queryTypescript);
      const eventListenerMatches = eventListenerQuery.matches(tree.rootNode);

      // Query for module-level code (immediately invoked functions, etc.)
      const moduleLevelQuery = new Query(tree.language, queryTypescript);
      const moduleLevelMatches = moduleLevelQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...exportMatches, ...eventListenerMatches, ...moduleLevelMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;
          for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
            footerLines.push(i);
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
        'for_statement',
        'for_in_statement',
        'for_of_statement',
        'switch_statement',
        'case_clause',
        'try_statement',
        'catch_clause',
        'conditional_expression',
        'binary_expression', // Logical operators
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryTypescript);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryTypescript);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a function/class signature
   */
  private findSignatureEnd(node: Node, lines: string[]): number {
    const startLine = node.startPosition.row;

    for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.includes('{') || line.endsWith(';') || line.includes('=>')) {
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

    // For arrow functions, look for variable name
    if (node.type === 'arrow_function') {
      const parent = node.parent;
      if (parent && parent.type === 'variable_declarator') {
        const nameNode = parent.childForFieldName('name');
        if (nameNode) {
          const line = lines[nameNode.startPosition.row];
          return line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
        }
      }
    }

    // For methods, use property name
    if (node.type === 'method_definition') {
      const propertyNode = node.childForFieldName('name');
      if (propertyNode) {
        const line = lines[propertyNode.startPosition.row];
        return line.substring(propertyNode.startPosition.column, propertyNode.endPosition.column).trim();
      }
    }

    return 'anonymous';
  }

  /**
   * Fallback heuristic for header identification
   */
  private identifyHeaderLinesHeuristic(lines: string[]): number[] {
    const headerLines: number[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Import statements
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        headerLines.push(index);
      }

      // Export statements
      if (trimmed.startsWith('export ') && !trimmed.includes('function') && !trimmed.includes('class')) {
        headerLines.push(index);
      }

      // Type/interface definitions
      if (trimmed.startsWith('type ') || trimmed.startsWith('interface ')) {
        headerLines.push(index);
      }

      // Class/function signatures (first line only)
      if (
        (trimmed.startsWith('class ') ||
          trimmed.startsWith('function ') ||
          (trimmed.startsWith('const ') && trimmed.includes('=>'))) &&
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
      const functionMatch = trimmed.match(/^(async\s+)?function\s+(\w+)/);
      if (functionMatch) {
        functions.push({
          name: functionMatch[2],
          startLine: index,
          endLine: index, // Simplified - would need block parsing
          complexity: 0.5,
          lineCount: 1,
          isSelected: false,
        });
      }

      // Arrow functions
      const arrowMatch = trimmed.match(/^const\s+(\w+)\s*=\s*\(/);
      if (arrowMatch) {
        functions.push({
          name: arrowMatch[1],
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

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Export statements at the end
      if (trimmed.startsWith('export ') && (trimmed.includes('default') || trimmed.includes('{'))) {
        footerLines.push(index);
      }

      // Event listeners
      if (trimmed.includes('addEventListener') || trimmed.includes('on(')) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
