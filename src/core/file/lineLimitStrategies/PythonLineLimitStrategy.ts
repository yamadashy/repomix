import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryPython } from '../../treeSitter/queries/queryPython.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Python-specific line limiting strategy
 */
export class PythonLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for import statements
      const importQuery = new Query(tree.language, queryPython);
      const importMatches = importQuery.matches(tree.rootNode);

      // Query for class definitions (signatures only)
      const classQuery = new Query(tree.language, queryPython);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for function definitions (signatures only)
      const functionQuery = new Query(tree.language, queryPython);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [...importMatches, ...classMatches, ...functionMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For imports, include the full statement
          if (node.type === 'import_statement' || node.type === 'import_from_statement') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For classes and functions, only include the signature and docstring
          else if (node.type === 'class_definition' || node.type === 'function_definition') {
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
      // Query for function definitions
      const functionQuery = new Query(tree.language, queryPython);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method definitions (inside classes)
      const methodQuery = new Query(tree.language, queryPython);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Process all function-like nodes
      [...functionMatches, ...methodMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          // Filter for function/method definitions
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
      // Query for main execution blocks
      const mainQuery = new Query(tree.language, queryPython);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for module-level code
      const moduleQuery = new Query(tree.language, queryPython);
      const moduleMatches = moduleQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...moduleMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for if __name__ == "__main__" blocks
          if (node.type === 'if_statement') {
            const condition = node.childForFieldName('condition');
            if (condition && this.isMainBlock(condition, lines)) {
              for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
                footerLines.push(i);
              }
            }
          }

          // Look for module-level assignments and calls
          if (node.type === 'expression_statement' || node.type === 'assignment') {
            // Only include if they're in the last 20% of the file
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
        'elif_clause',
        'else_clause',
        'while_statement',
        'for_statement',
        'try_statement',
        'except_clause',
        'finally_clause',
        'with_statement',
        'conditional_expression',
        'boolean_operator', // and, or operators
        'comparison_operator', // chained comparisons
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryPython);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryPython);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for decorators
      const decorators = node.children.filter((child) => child && child.type === 'decorator');
      complexity += decorators.length * 0.5;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a function/class signature including docstring
   */
  private findSignatureEnd(node: Node, lines: string[]): number {
    const startLine = node.startPosition.row;
    let signatureEnd = startLine;

    // Find the end of the signature (first line with ':')
    for (let i = startLine; i < Math.min(startLine + 5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.endsWith(':')) {
        signatureEnd = i;
        break;
      }
    }

    // Check for docstring on the next line
    if (signatureEnd + 1 < lines.length) {
      const nextLine = lines[signatureEnd + 1].trim();
      if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
        // Find the end of the docstring
        for (let i = signatureEnd + 1; i < Math.min(signatureEnd + 10, lines.length); i++) {
          const line = lines[i].trim();
          if ((line.endsWith('"""') || line.endsWith("'''")) && i > signatureEnd + 1) {
            signatureEnd = i;
            break;
          }
        }
      }
    }

    return signatureEnd;
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

    return 'anonymous';
  }

  /**
   * Check if condition is a main block check
   */
  private isMainBlock(condition: Node, lines: string[]): boolean {
    const line = lines[condition.startPosition.row];
    return line.includes('__name__') && line.includes('__main__');
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

      // Shebang and encoding
      if (index === 0 && (trimmed.startsWith('#!') || trimmed.startsWith('# -*- coding:'))) {
        headerLines.push(index);
      }

      // Module docstring
      if (index < 3 && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
        headerLines.push(index);
      }

      // Class/function signatures (first line only)
      if (
        (trimmed.startsWith('class ') || trimmed.startsWith('def ') || trimmed.startsWith('async def ')) &&
        trimmed.endsWith(':')
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
      const functionMatch = trimmed.match(/^(async\s+)?def\s+(\w+)/);
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

      // Method declarations (inside classes)
      const methodMatch = trimmed.match(/^\s+def\s+(\w+)/);
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

      // Main execution block
      if (trimmed.startsWith('if __name__') && trimmed.includes('__main__')) {
        footerLines.push(index);
      }

      // Module-level code in the last section
      if (
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('def ') &&
        !trimmed.startsWith('class ') &&
        !trimmed.startsWith('import ') &&
        !trimmed.startsWith('from ') &&
        trimmed.length > 0
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
