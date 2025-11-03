import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryRuby } from '../../treeSitter/queries/queryRuby.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Ruby-specific line limiting strategy
 */
export class RubyLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for require statements
      const requireQuery = new Query(tree.language, queryRuby);
      const requireMatches = requireQuery.matches(tree.rootNode);

      // Query for module declarations
      const moduleQuery = new Query(tree.language, queryRuby);
      const moduleMatches = moduleQuery.matches(tree.rootNode);

      // Query for class declarations (signatures only)
      const classQuery = new Query(tree.language, queryRuby);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for method definitions (signatures only)
      const methodQuery = new Query(tree.language, queryRuby);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [...requireMatches, ...moduleMatches, ...classMatches, ...methodMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For require statements, include the full statement
          if (node.type === 'call' && this.isRequireStatement(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For modules, classes, and methods, only include the signature
          else if (
            node.type === 'module' ||
            node.type === 'class' ||
            node.type === 'method' ||
            node.type === 'singleton_method'
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
      // Query for method definitions
      const methodQuery = new Query(tree.language, queryRuby);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Query for singleton method definitions
      const singletonMethodQuery = new Query(tree.language, queryRuby);
      const singletonMethodMatches = singletonMethodQuery.matches(tree.rootNode);

      // Process all method-like nodes
      [...methodMatches, ...singletonMethodMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          // Filter for method definitions
          if (capture.name.includes('definition.method')) {
            const node = capture.node;
            const startLine = node.startPosition.row;
            const endLine = node.endPosition.row;

            // Extract method name
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
      const mainQuery = new Query(tree.language, queryRuby);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for module-level code
      const moduleQuery = new Query(tree.language, queryRuby);
      const moduleMatches = moduleQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...moduleMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main execution blocks (if __FILE__ == $0)
          if (node.type === 'if' && this.isMainBlock(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for module-level code in the last section
          if (node.type === 'call' || node.type === 'assignment') {
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
        'if',
        'elsif',
        'else',
        'unless',
        'while',
        'until',
        'for',
        'case',
        'when',
        'begin',
        'rescue',
        'ensure',
        'break',
        'next',
        'redo',
        'retry',
        'return',
        'conditional', // ternary operator
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryRuby);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested methods
      const nestedMethodQuery = new Query(node.tree.language, queryRuby);
      const nestedMethods = nestedMethodQuery.matches(node);
      complexity += nestedMethods.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for blocks and procs
      const blockQuery = new Query(node.tree.language, queryRuby);
      const blockMatches = blockQuery.matches(node);
      complexity += blockMatches.length * 0.5;

      // Additional complexity for metaprogramming
      const metaQuery = new Query(node.tree.language, queryRuby);
      const metaMatches = metaQuery.matches(node);
      complexity += metaMatches.length * 0.3;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a module/class/method signature
   */
  private findSignatureEnd(node: Node, lines: string[]): number {
    const startLine = node.startPosition.row;

    for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length === 0 || line.includes('end') || line.includes('do')) {
        return i;
      }
    }

    return startLine;
  }

  /**
   * Extract method name from node
   */
  private extractFunctionName(node: Node, lines: string[]): string {
    // Try to get name from identifier
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      const line = lines[nameNode.startPosition.row];
      return line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
    }

    return 'anonymous';
  }

  /**
   * Check if call is a require statement
   */
  private isRequireStatement(node: Node, lines: string[]): boolean {
    const methodNode = node.childForFieldName('method');
    if (methodNode) {
      const line = lines[methodNode.startPosition.row];
      const method = line.substring(methodNode.startPosition.column, methodNode.endPosition.column).trim();
      return method === 'require' || method === 'require_relative' || method === 'load';
    }

    return false;
  }

  /**
   * Check if if statement is a main block
   */
  private isMainBlock(node: Node, lines: string[]): boolean {
    const condition = node.childForFieldName('condition');
    if (condition) {
      const line = lines[condition.startPosition.row];
      return line.includes('__FILE__') && line.includes('$0');
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

      // Require statements
      if (trimmed.startsWith('require ') || trimmed.startsWith('require_relative ') || trimmed.startsWith('load ')) {
        headerLines.push(index);
      }

      // Module signatures (first line only)
      if (trimmed.startsWith('module ') && !trimmed.includes('end')) {
        headerLines.push(index);
      }

      // Class signatures (first line only)
      if ((trimmed.startsWith('class ') || trimmed.startsWith('class <<')) && !trimmed.includes('end')) {
        headerLines.push(index);
      }

      // Method signatures (first line only)
      if ((trimmed.startsWith('def ') || trimmed.startsWith('def self.')) && !trimmed.includes('end')) {
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

      // Method declarations
      const methodMatch = trimmed.match(/^def\s+(self\.)?(\w+)/);
      if (methodMatch) {
        functions.push({
          name: methodMatch[2],
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

      // Main execution block
      if (trimmed.includes('if __FILE__ == $0')) {
        footerLines.push(index);
      }

      // Module-level code in the last section
      if (
        !trimmed.startsWith('def ') &&
        !trimmed.startsWith('class ') &&
        !trimmed.startsWith('module ') &&
        !trimmed.startsWith('require ') &&
        !trimmed.startsWith('end') &&
        !trimmed.startsWith('#') &&
        trimmed.length > 0
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
