import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryJava } from '../../treeSitter/queries/queryJava.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * Kotlin-specific line limiting strategy
 * Note: Kotlin uses a similar AST to Java, so we can reuse the Java query
 */
export class KotlinLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for package declarations
      const packageQuery = new Query(tree.language, queryJava);
      const packageMatches = packageQuery.matches(tree.rootNode);

      // Query for import statements
      const importQuery = new Query(tree.language, queryJava);
      const importMatches = importQuery.matches(tree.rootNode);

      // Query for class declarations (signatures only)
      const classQuery = new Query(tree.language, queryJava);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for object declarations (signatures only)
      const objectQuery = new Query(tree.language, queryJava);
      const objectMatches = objectQuery.matches(tree.rootNode);

      // Query for interface declarations (signatures only)
      const interfaceQuery = new Query(tree.language, queryJava);
      const interfaceMatches = interfaceQuery.matches(tree.rootNode);

      // Query for function declarations (signatures only)
      const functionQuery = new Query(tree.language, queryJava);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [
        ...packageMatches,
        ...importMatches,
        ...classMatches,
        ...objectMatches,
        ...interfaceMatches,
        ...functionMatches,
      ].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // For package and imports, include the full statement
          if (node.type === 'package_declaration' || node.type === 'import_declaration') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              headerLines.push(i);
            }
          }
          // For classes, objects, interfaces, and functions, only include the signature
          else if (
            node.type === 'class_declaration' ||
            node.type === 'object_declaration' ||
            node.type === 'interface_declaration' ||
            node.type === 'function_declaration'
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
      const functionQuery = new Query(tree.language, queryJava);
      const functionMatches = functionQuery.matches(tree.rootNode);

      // Query for method declarations (inside classes)
      const methodQuery = new Query(tree.language, queryJava);
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
      const mainQuery = new Query(tree.language, queryJava);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for companion object initializers
      const companionQuery = new Query(tree.language, queryJava);
      const companionMatches = companionQuery.matches(tree.rootNode);

      // Query for top-level property initializers
      const propertyQuery = new Query(tree.language, queryJava);
      const propertyMatches = propertyQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...mainMatches, ...companionMatches, ...propertyMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for main function
          if (node.type === 'function_declaration' && this.isMainFunction(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for companion object initializers
          if (node.type === 'companion_object') {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for top-level property initializers in the last section
          if (node.type === 'property_declaration') {
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
        'when_expression',
        'when_entry',
        'while_statement',
        'do_while_statement',
        'for_statement',
        'try_statement',
        'catch_clause',
        'finally_clause',
        'conditional_expression',
        'binary_expression', // Logical operators
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryJava);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested functions
      const nestedFunctionQuery = new Query(node.tree.language, queryJava);
      const nestedFunctions = nestedFunctionQuery.matches(node);
      complexity += nestedFunctions.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for annotations
      const annotations = node.children.filter((child) => child && child.type === 'annotation');
      complexity += annotations.length * 0.5;

      // Additional complexity for null safety operators
      const nullSafetyQuery = new Query(node.tree.language, queryJava);
      const nullSafetyMatches = nullSafetyQuery.matches(node);
      complexity += nullSafetyMatches.length * 0.3;

      // Additional complexity for extension functions
      const extensionQuery = new Query(node.tree.language, queryJava);
      const extensionMatches = extensionQuery.matches(node);
      complexity += extensionMatches.length * 0.4;

      // Additional complexity for coroutines (suspend functions)
      const coroutineQuery = new Query(node.tree.language, queryJava);
      const coroutineMatches = coroutineQuery.matches(node);
      complexity += coroutineMatches.length * 0.5;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a class/interface/object/function signature
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

      // Check if it's a main function
      if (name === 'main') {
        const functionLine = lines[node.startPosition.row];
        return functionLine.includes('fun main');
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

      // Package declarations
      if (trimmed.startsWith('package ')) {
        headerLines.push(index);
      }

      // Import statements
      if (trimmed.startsWith('import ')) {
        headerLines.push(index);
      }

      // Class/object/interface signatures (first line only)
      if (
        (trimmed.startsWith('class ') ||
          trimmed.startsWith('object ') ||
          trimmed.startsWith('interface ') ||
          trimmed.startsWith('data class ') ||
          trimmed.startsWith('sealed class ') ||
          trimmed.startsWith('abstract class ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Function signatures (first line only)
      if (
        (trimmed.startsWith('fun ') ||
          trimmed.startsWith('public fun ') ||
          trimmed.startsWith('private fun ') ||
          trimmed.startsWith('internal fun ') ||
          trimmed.startsWith('suspend fun ')) &&
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
      const functionMatch = trimmed.match(/^(public|private|internal)?\s*(suspend)?\s*fun\s+(\w+)\s*\(/);
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
      if (trimmed.includes('fun main')) {
        footerLines.push(index);
      }

      // Companion object
      if (trimmed.includes('companion object')) {
        footerLines.push(index);
      }

      // Top-level property initializers in the last section
      if (
        (trimmed.includes('val ') || trimmed.includes('var ')) &&
        !trimmed.includes('fun ') &&
        !trimmed.includes('class ') &&
        !trimmed.includes('object ') &&
        !trimmed.includes('interface ')
      ) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
