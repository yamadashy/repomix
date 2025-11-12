import { type Node, Query, type Tree } from 'web-tree-sitter';
import { queryCSharp } from '../../treeSitter/queries/queryCSharp.js';
import type { FunctionAnalysis, LanguageStrategy } from '../lineLimitTypes.js';

/**
 * C#-specific line limiting strategy
 */
export class CSharpLineLimitStrategy implements LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[] {
    const headerLines: number[] = [];

    try {
      // Query for using statements
      const usingQuery = new Query(tree.language, queryCSharp);
      const usingMatches = usingQuery.matches(tree.rootNode);

      // Query for namespace declarations
      const namespaceQuery = new Query(tree.language, queryCSharp);
      const namespaceMatches = namespaceQuery.matches(tree.rootNode);

      // Query for class declarations (signatures only)
      const classQuery = new Query(tree.language, queryCSharp);
      const classMatches = classQuery.matches(tree.rootNode);

      // Query for interface declarations (signatures only)
      const interfaceQuery = new Query(tree.language, queryCSharp);
      const interfaceMatches = interfaceQuery.matches(tree.rootNode);

      // Query for method declarations (signatures only)
      const methodQuery = new Query(tree.language, queryCSharp);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Collect line numbers from all header matches
      [...usingMatches, ...namespaceMatches, ...classMatches, ...interfaceMatches, ...methodMatches].forEach(
        (match) => {
          match.captures.forEach((capture) => {
            const node = capture.node;

            // For using and namespace, include the full statement
            if (node.type === 'using_directive' || node.type === 'namespace_declaration') {
              for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
                headerLines.push(i);
              }
            }
            // For classes, interfaces, and methods, only include the signature
            else if (
              node.type === 'class_declaration' ||
              node.type === 'interface_declaration' ||
              node.type === 'method_declaration'
            ) {
              const signatureEnd = this.findSignatureEnd(node, lines);
              for (let i = node.startPosition.row; i <= signatureEnd && i < lines.length; i++) {
                headerLines.push(i);
              }
            }
          });
        },
      );
    } catch (error) {
      // If parsing fails, fall back to basic heuristics
      return this.identifyHeaderLinesHeuristic(lines);
    }

    return [...new Set(headerLines)].sort((a, b) => a - b);
  }

  analyzeFunctions(lines: string[], tree: Tree): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];

    try {
      // Query for method declarations
      const methodQuery = new Query(tree.language, queryCSharp);
      const methodMatches = methodQuery.matches(tree.rootNode);

      // Query for constructor declarations
      const constructorQuery = new Query(tree.language, queryCSharp);
      const constructorMatches = constructorQuery.matches(tree.rootNode);

      // Query for property declarations (getters/setters)
      const propertyQuery = new Query(tree.language, queryCSharp);
      const propertyMatches = propertyQuery.matches(tree.rootNode);

      // Process all method-like nodes
      [...methodMatches, ...constructorMatches, ...propertyMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          // Filter for method/constructor/property definitions
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
      // Query for static constructors
      const staticConstructorQuery = new Query(tree.language, queryCSharp);
      const staticConstructorMatches = staticConstructorQuery.matches(tree.rootNode);

      // Query for Main methods
      const mainQuery = new Query(tree.language, queryCSharp);
      const mainMatches = mainQuery.matches(tree.rootNode);

      // Query for entry point methods
      const entryQuery = new Query(tree.language, queryCSharp);
      const entryMatches = entryQuery.matches(tree.rootNode);

      // Collect line numbers from footer matches
      [...staticConstructorMatches, ...mainMatches, ...entryMatches].forEach((match) => {
        match.captures.forEach((capture) => {
          const node = capture.node;

          // Look for Main method
          if (node.type === 'method_declaration' && this.isMainMethod(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
            }
          }

          // Look for static constructors
          if (node.type === 'constructor_declaration' && this.isStaticConstructor(node, lines)) {
            for (let i = node.startPosition.row; i <= node.endPosition.row && i < lines.length; i++) {
              footerLines.push(i);
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
        'for_statement',
        'foreach_statement',
        'do_statement',
        'switch_statement',
        'switch_expression',
        'case_switch_label',
        'case_pattern_switch_label',
        'try_statement',
        'catch_clause',
        'finally_clause',
        'conditional_expression',
        'binary_expression', // Logical operators
      ];

      controlStructures.forEach((structure) => {
        const query = new Query(node.tree.language, queryCSharp);
        const matches = query.matches(node);
        complexity += matches.length;
      });

      // Additional complexity for nested methods
      const nestedMethodQuery = new Query(node.tree.language, queryCSharp);
      const nestedMethods = nestedMethodQuery.matches(node);
      complexity += nestedMethods.length * 2;

      // Additional complexity for multiple parameters
      const parameters = node.childForFieldName('parameters');
      if (parameters) {
        const paramCount = parameters.namedChildCount;
        complexity += Math.min(paramCount / 5, 1); // Max +1 for parameters
      }

      // Additional complexity for attributes
      const attributes = node.children.filter((child) => child && child.type === 'attribute_list');
      complexity += attributes.length * 0.5;

      // Additional complexity for async/await
      const asyncQuery = new Query(node.tree.language, queryCSharp);
      const asyncMatches = asyncQuery.matches(node);
      complexity += asyncMatches.length * 0.3;

      // Additional complexity for LINQ expressions
      const linqQuery = new Query(node.tree.language, queryCSharp);
      const linqMatches = linqQuery.matches(node);
      complexity += linqMatches.length * 0.4;
    } catch (error) {
      // If complexity calculation fails, return default
      return 1;
    }

    // Normalize to 0-1 scale (assuming max complexity of 20)
    return Math.min(complexity / 20, 1);
  }

  /**
   * Find the end of a class/interface/method signature
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
   * Extract method name from node
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
   * Check if method is a Main method
   */
  private isMainMethod(node: Node, lines: string[]): boolean {
    const nameNode = node.childForFieldName('name');
    if (nameNode && nameNode.type === 'identifier') {
      const line = lines[nameNode.startPosition.row];
      const name = line.substring(nameNode.startPosition.column, nameNode.endPosition.column).trim();

      // Check if it's a static void Main method
      if (name === 'Main') {
        // Look for 'static' in method declaration
        const methodLine = lines[node.startPosition.row];
        return methodLine.includes('static');
      }
    }

    return false;
  }

  /**
   * Check if constructor is a static constructor
   */
  private isStaticConstructor(node: Node, lines: string[]): boolean {
    const methodLine = lines[node.startPosition.row];
    return methodLine.includes('static') && !methodLine.includes('(');
  }

  /**
   * Fallback heuristic for header identification
   */
  private identifyHeaderLinesHeuristic(lines: string[]): number[] {
    const headerLines: number[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Using statements
      if (trimmed.startsWith('using ')) {
        headerLines.push(index);
      }

      // Namespace declarations
      if (trimmed.startsWith('namespace ')) {
        headerLines.push(index);
      }

      // Class/interface signatures (first line only)
      if (
        (trimmed.startsWith('class ') ||
          trimmed.startsWith('interface ') ||
          trimmed.startsWith('public class ') ||
          trimmed.startsWith('public interface ')) &&
        !trimmed.includes('{')
      ) {
        headerLines.push(index);
      }

      // Method signatures (first line only)
      if (
        (trimmed.includes('public ') ||
          trimmed.includes('private ') ||
          trimmed.includes('protected ') ||
          trimmed.includes('static ')) &&
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

      // Method declarations
      const methodMatch = trimmed.match(/^(public|private|protected)?\s*(static)?\s*(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/);
      if (methodMatch) {
        const returnType = methodMatch[3];
        const methodName = methodMatch[4];

        // Skip constructors (return type matches class name or is void)
        if (returnType !== methodName) {
          functions.push({
            name: methodName,
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

      // Main method
      if (trimmed.includes('static void Main') || trimmed.includes('static int Main')) {
        footerLines.push(index);
      }

      // Static constructor
      if (trimmed.includes('static ') && trimmed.includes('{') && !trimmed.includes('(')) {
        footerLines.push(index);
      }
    });

    return footerLines;
  }
}
