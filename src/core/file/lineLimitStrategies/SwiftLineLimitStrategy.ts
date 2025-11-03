import { type Node, Query, type Tree } from 'web-tree-sitter';
import { querySwift } from '../../treeSitter/queries/querySwift.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Swift-specific line limiting strategy
 */
export class SwiftLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for import statements
      const importQuery = new Query(tree.language, querySwift);
      const importMatches = importQuery.matches(tree.rootNode);

      // Query for class declarations (signatures only)
      const classQuery = new Query(tree.language, querySwift);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for struct declarations (signatures only)
      const structQuery = new Query(tree.language, querySwift);
      const structMatches = structQuery.matches(tree.rootNode);

      // Query for protocol declarations (signatures only)
      const protocolQuery = new Query(tree.language, querySwift);
      const protocolMatches = protocolQuery.matches(tree.rootNode);

      // Query for function declarations (signatures only)
      const functionQuery = new Query(tree.language, querySwift);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for property declarations
      const propertyQuery = new Query(tree.language, querySwift);
      const propertyMatches = propertyQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [
        ...importMatches,
        ...classMatches,
        ...structMatches,
        ...protocolMatches,
        ...functionMatches,
        ...propertyMatches,
      ].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For imports, include the full statement
          if (node.type === 'import_declaration') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For classes, structs, protocols, and functions, only include the signature
          else if (
            node.type === 'class_declaration' ||
            node.type === 'struct_declaration' ||
            node.type === 'protocol_declaration' ||
            node.type === 'function_declaration'
          ) {
            const signatureEnd = this.findSignatureEnd(node, lines);
            for (let i = node.startPosition.row; i <= signatureEnd && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For properties, include the full declaration
          else if (node.type === 'property_declaration') {
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
      const functionQuery = new Query(tree.language, querySwift);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations (inside classes/structs)
      const methodQuery = new Query(tree.language, querySwift);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Query for initializers
      const initQuery = new Query(tree.language, querySwift);
      const initMatches = initQuery.matches(tree.rootNode);

      // Query for deinitializers
      const deinitQuery = new Query(tree.language, querySwift);
      const deinitMatches = deinitQuery.matches(tree.rootNode);

      // Process all function-like nodes
      [...functionMatches, ...methodMatches, ...initMatches, ...deinitMatches].forEach((match) => {
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
      // Query for main execution blocks
      const mainQuery = new Query(tree.language, querySwift);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for global variable declarations
      const globalQuery = new Query(tree.language, querySwift);
      const globalMatches = globalQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...globalMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main function
          if (node.type === 'function_declaration' && this.isMainFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for global variable declarations in the last section
          if (node.type === 'constant_declaration' || node.type === 'variable_declaration') {
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
        'guard_statement',
        'while_statement',
        'for_statement',
        'for_in_statement',
        'repeat_while_statement',
        'switch_statement',
        'case_statement',
        'default_statement',
        'do_statement',
        'catch_clause',
        'conditional_operator', // ternary operator
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, querySwift);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, querySwift);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for closures
      const closureQuery = new Query(node.tree.language, querySwift);
      const closureMatches = closureQuery.matches(node);
      complexity += closureMatches.length * 0.5;

      // Additional complexity for generics
      const genericQuery = new Query(node.tree.language, querySwift);
      const genericMatches = genericQuery.matches(node);
      complexity += genericMatches.length * 0.3;

      // Additional complexity for optional types
      const optionalQuery = new Query(node.tree.language, querySwift);
      const optionalMatches = optionalQuery.matches(node);
      complexity += optionalMatches.length * 0.2;

      // Additional complexity for async/await
      const asyncQuery = new Query(node.tree.language, querySwift);
      const asyncMatches = asyncQuery.matches(node);
      complexity += asyncMatches.length * 0.4;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a class/struct/protocol/function signature
   */
  private findSignatureEnd(node: Node, lines: string[]): number {
    const startLine = node.startPosition.row;

    for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.includes('{')) {
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
    if (nameNode && nameNode.type === 'simple_identifier') {
      const line = lines[nameNode.startPosition.row];
      return line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
    }

    // For init/deinit methods
    if (node.type === 'init_declaration') {
      return 'init';
    }

    if (node.type === 'deinit_declaration') {
      return 'deinit';
    }

    return 'anonymous';
  }

  /**
   * Check if function is main function
   */
  private isMainFunction(node: Node, lines: string[]): boolean {
    const nameNode = node.childForFieldName('name');
    if (nameNode && nameNode.type === 'simple_identifier') {
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

      // Import statements
      if (trimmed.startsWith('import ')) {
        headerLines.push(index);
      }

      // Class/struct/protocol signatures (first line only)
      if (
        (trimmed.startsWith('class ') ||
          trimmed.startsWith('struct ') ||
          trimmed.startsWith('protocol ') ||
          trimmed.startsWith('enum ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Function signatures (first line only)
      if (
        (trimmed.startsWith('func ') ||
          trimmed.startsWith('public func ') ||
          trimmed.startsWith('private func ') ||
          trimmed.startsWith('internal func ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Property declarations
      if ((trimmed.includes('var ') || trimmed.includes('let ')) && trimmed.includes('(') && trimmed.includes(')')) {
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
      const functionMatch = trimmed.match(/^(public|private|internal)?\s*func\s+(\w+)\s*\(/);
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

      // Init/deinit declarations
      if (trimmed.startsWith('init(') || trimmed.startsWith('deinit')) {
        functions.push({
          name: trimmed.startsWith('init(') ? 'init' : 'deinit',
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
      if (trimmed.includes('func main')) {
        footerLines.push(index);
      }

      // Global variable declarations in the last section
      if (
        (trimmed.startsWith('let ') || trimmed.startsWith('var ')) &&
        !trimmed.includes('func ') &&
        !trimmed.includes('class ') &&
        !trimmed.includes('struct ') &&
        !trimmed.includes('protocol ')
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
