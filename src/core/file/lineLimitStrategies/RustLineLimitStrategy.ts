import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryRust } from '../../treeSitter/queries/queryRust.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Rust-specific line limiting strategy
 */
export class RustLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for use statements
      const useQuery = new Query(tree.language, queryRust);
      const useMatches = useQuery.matches(tree.rootNode);

      // Query for mod declarations
      const modQuery = new Query(tree.language, queryRust);
      const modMatches = modQuery.matches(tree.rootNode);

      // Query for struct declarations (signatures only)
      const structQuery = new Query(tree.language, queryRust);
      const structMatches = structQuery.matches(tree.rootNode);

      // Query for enum declarations (signatures only)
      const enumQuery = new Query(tree.language, queryRust);
      const enumMatches = enumQuery.matches(tree.rootNode);

      // Query for trait declarations (signatures only)
      const traitQuery = new Query(tree.language, queryRust);
      const traitMatches = traitQuery.matches(tree.rootNode);

      // Query for function declarations (signatures only)
      const functionQuery = new Query(tree.language, queryRust);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for impl blocks (signatures only)
      const implQuery = new Query(tree.language, queryRust);
      const implMatches = implQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [
        ...useMatches,
        ...modMatches,
        ...structMatches,
        ...enumMatches,
        ...traitMatches,
        ...functionMatches,
        ...implMatches,
      ].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For use and mod statements, include the full statement
          if (node.type === 'use_declaration' || node.type === 'mod_item') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For structs, enums, traits, functions, and impl blocks, only include the signature
          else if (
            node.type === 'struct_item' ||
            node.type === 'enum_item' ||
            node.type === 'trait_item' ||
            node.type === 'function_item' ||
            node.type === 'impl_item'
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
      // Query for function definitions
      const functionQuery = new Query(tree.language, queryRust);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method definitions (inside impl blocks)
      const methodQuery = new Query(tree.language, queryRust);
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
      // Query for main function
      const mainQuery = new Query(tree.language, queryRust);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for tests
      const testQuery = new Query(tree.language, queryRust);
      const testMatches = testQuery.matches(tree.rootNode);

      // Query for module-level code
      const moduleQuery = new Query(tree.language, queryRust);
      const moduleMatches = moduleQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...testMatches, ...moduleMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main function
          if (node.type === 'function_item' && this.isMainFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for test functions
          if (node.type === 'function_item' && this.isTestFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for module-level code in the last section
          if (node.type === 'expression_statement' || node.type === 'macro_invocation') {
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
        'if_expression',
        'if_let_expression',
        'match_expression',
        'match_arm',
        'while_expression',
        'loop_expression',
        'for_expression',
        'while_let_expression',
        'break_expression',
        'continue_expression',
        'return_expression',
        'question_mark_expression', // ? operator
        'as_expression', // as casting
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryRust);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryRust);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for lifetimes
      const lifetimeQuery = new Query(node.tree.language, queryRust);
      const lifetimeMatches = lifetimeQuery.matches(node);
      complexity += lifetimeMatches.length * 0.3;

      // Additional complexity for generics
      const genericQuery = new Query(node.tree.language, queryRust);
      const genericMatches = genericQuery.matches(node);
      complexity += genericMatches.length * 0.2;

      // Additional complexity for unsafe blocks
      const unsafeQuery = new Query(node.tree.language, queryRust);
      const unsafeMatches = unsafeQuery.matches(node);
      complexity += unsafeMatches.length * 0.5;

      // Additional complexity for async/await
      const asyncQuery = new Query(node.tree.language, queryRust);
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
   * Find the end of a struct/enum/trait/function/impl signature
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
    if (nameNode && nameNode.type === 'identifier') {
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
   * Check if function is a test function
   */
  private isTestFunction(node: Node, lines: string[]): boolean {
    const nameNode = node.childForFieldName('name');
    if (nameNode && nameNode.type === 'identifier') {
      const line = lines[nameNode.startPosition.row];
      const name = line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
      return name.startsWith('test_') || name.includes('_test');
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

      // Use statements
      if (trimmed.startsWith('use ')) {
        headerLines.push(index);
      }

      // Mod declarations
      if (trimmed.startsWith('mod ')) {
        headerLines.push(index);
      }

      // Struct/enum/trait signatures (first line only)
      if (
        (trimmed.startsWith('struct ') || trimmed.startsWith('enum ') || trimmed.startsWith('trait ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Function signatures (first line only)
      if (
        (trimmed.startsWith('fn ') ||
          trimmed.startsWith('pub fn ') ||
          trimmed.startsWith('async fn ') ||
          trimmed.startsWith('pub async fn ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Impl block signatures (first line only)
      if ((trimmed.startsWith('impl ') || trimmed.startsWith('pub impl ')) && !trimmed.includes('{')) {
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
      const functionMatch = trimmed.match(/^(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(/);
      if (functionMatch) {
        functions.push({
          name: functionMatch[3],
          startLine: index,
          endLine: index, // Simplified - would need block parsing
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
      if (trimmed.startsWith('fn main')) {
        footerLines.push(index);
      }

      // Test functions
      if ((trimmed.startsWith('fn test_') || trimmed.includes('_test')) && trimmed.includes('(')) {
        footerLines.push(index);
      }

      // Module-level code in the last section
      if (
        !trimmed.startsWith('fn ') &&
        !trimmed.startsWith('struct ') &&
        !trimmed.startsWith('enum ') &&
        !trimmed.startsWith('trait ') &&
        !trimmed.startsWith('impl ') &&
        !trimmed.startsWith('use ') &&
        !trimmed.startsWith('mod ') &&
        trimmed.length > 0
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
