import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryPhp } from '../../treeSitter/queries/queryPhp.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * PHP-specific line limiting strategy
 */
export class PhpLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for require/include statements
      const requireQuery = new Query(tree.language, queryPhp);
      const requireMatches = requireQuery.matches(tree.rootNode);

      // Query for namespace declarations
      const namespaceQuery = new Query(tree.language, queryPhp);
      const namespaceMatches = namespaceQuery.matches(tree.rootNode);

      // Query for use statements
      const useQuery = new Query(tree.language, queryPhp);
      const useMatches = useQuery.matches(tree.rootNode);

      // Query for class declarations (signatures only)
      const classQuery = new Query(tree.language, queryPhp);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for interface declarations (signatures only)
      const interfaceQuery = new Query(tree.language, queryPhp);
      const interfaceMatches = interfaceQuery.matches(tree.rootNode);

      // Query for trait declarations (signatures only)
      const traitQuery = new Query(tree.language, queryPhp);
      const traitMatches = traitQuery.matches(tree.rootNode);

      // Query for function declarations (signatures only)
      const functionQuery = new Query(tree.language, queryPhp);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations (signatures only)
      const methodQuery = new Query(tree.language, queryPhp);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [
        ...requireMatches,
        ...namespaceMatches,
        ...useMatches,
        ...classMatches,
        ...interfaceMatches,
        ...traitMatches,
        ...functionMatches,
        ...methodMatches,
      ].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For require/include, namespace, and use statements, include the full statement
          if (
            node.type === 'expression_statement' ||
            node.type === 'namespace_definition' ||
            node.type === 'namespace_use_clause'
          ) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For classes, interfaces, traits, functions, and methods, only include the signature
          else if (
            node.type === 'class_declaration' ||
            node.type === 'interface_declaration' ||
            node.type === 'trait_declaration' ||
            node.type === 'function_definition' ||
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
      // Query for function definitions
      const functionQuery = new Query(tree.language, queryPhp);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method definitions
      const methodQuery = new Query(tree.language, queryPhp);
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
      const mainQuery = new Query(tree.language, queryPhp);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for module-level code
      const moduleQuery = new Query(tree.language, queryPhp);
      const moduleMatches = moduleQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...moduleMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main execution blocks (outside of classes/functions)
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
        'elseif_clause',
        'while_statement',
        'do_while_statement',
        'for_statement',
        'foreach_statement',
        'switch_statement',
        'case_statement',
        'default_statement',
        'try_statement',
        'catch_clause',
        'finally_clause',
        'conditional_expression',
        'binary_expression', // Logical operators
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryPhp);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryPhp);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for type hints
      const typeQuery = new Query(node.tree.language, queryPhp);
      const typeMatches = typeQuery.matches(node);
      complexity += typeMatches.length * 0.2;

      // Additional complexity for visibility modifiers
      const visibilityQuery = new Query(node.tree.language, queryPhp);
      const visibilityMatches = visibilityQuery.matches(node);
      complexity += visibilityMatches.length * 0.1;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a class/interface/trait/function/method signature
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
    if (nameNode && nameNode.type === 'name') {
      const line = lines[nameNode.startPosition.row];
      return line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();
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

      // PHP opening tag
      if (trimmed.startsWith('<?php')) {
        headerLines.push(index);
      }

      // Require/include statements
      if (
        trimmed.startsWith('require ') ||
        trimmed.startsWith('include ') ||
        trimmed.startsWith('require_once ') ||
        trimmed.startsWith('include_once ')
      ) {
        headerLines.push(index);
      }

      // Namespace declarations
      if (trimmed.startsWith('namespace ')) {
        headerLines.push(index);
      }

      // Use statements
      if (trimmed.startsWith('use ')) {
        headerLines.push(index);
      }

      // Class/interface/trait signatures (first line only)
      if (
        (trimmed.startsWith('class ') ||
          trimmed.startsWith('interface ') ||
          trimmed.startsWith('trait ') ||
          trimmed.startsWith('abstract class ') ||
          trimmed.startsWith('final class ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Function/method signatures (first line only)
      if (
        (trimmed.startsWith('function ') ||
          trimmed.startsWith('public function ') ||
          trimmed.startsWith('private function ') ||
          trimmed.startsWith('protected function ') ||
          trimmed.startsWith('static function ')) &&
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
      const functionMatch = trimmed.match(/^(public|private|protected)?\s*(static)?\s*function\s+(\w+)\s*\(/);
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

      // Module-level code in the last section
      if (
        !trimmed.startsWith('function ') &&
        !trimmed.startsWith('class ') &&
        !trimmed.startsWith('interface ') &&
        !trimmed.startsWith('trait ') &&
        !trimmed.startsWith('namespace ') &&
        !trimmed.startsWith('use ') &&
        !trimmed.startsWith('require ') &&
        !trimmed.startsWith('include ') &&
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
