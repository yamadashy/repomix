import type { Node, Query, Tree } from 'web-tree-sitter';
import type { RepomixConfigMerged } from '../../../config/configSchema.js';

export interface ParseContext {
  fileContent: string;
  lines: string[];
  tree: Tree;
  query: Query;
  config: RepomixConfigMerged;
}

export interface ParseStrategy {
  parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    context: ParseContext,
  ): string | null;
}

/**
 * Result type for parse operations
 */
export type ParseResult = {
  content: string | null;
  processedSignatures?: Set<string>;
};

/**
 * Base abstract class providing common functionality for all parse strategies
 *
 * IMPORTANT: Strategy instances are shared across all files of the same language.
 * Strategies MUST be stateless - do not add instance variables or mutable state.
 * All data should come from method parameters only.
 */
export abstract class BaseParseStrategy implements ParseStrategy {
  /**
   * Main entry point for parsing a capture. Must be implemented by subclasses.
   */
  abstract parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    context: ParseContext,
  ): string | null;

  /**
   * Helper method to get capture types from a capture name
   *
   * NOTE: Uses includes() intentionally to match hierarchical capture names.
   * Tree-sitter queries use captures like @name.definition.function for function names,
   * which should match 'definition.function'. This is not a bug but a design choice.
   *
   * @param name - The capture name to analyze (e.g., 'name.definition.function')
   * @param captureTypes - Object containing capture type constants
   * @returns Set of matching capture types
   */
  protected getCaptureTypes<T extends Record<string, string>>(name: string, captureTypes: T): Set<T[keyof T]> {
    const types = new Set<T[keyof T]>();
    for (const type of Object.values(captureTypes)) {
      // Uses includes() to match hierarchical names (e.g., 'name.definition.function' matches 'definition.function')
      if (name.includes(type)) {
        types.add(type as T[keyof T]);
      }
    }
    return types;
  }

  /**
   * Check if content has been processed and add it if not
   * @param content - The content to check
   * @param processedChunks - Set of already processed chunks
   * @returns true if content is new and was added, false if already processed
   */
  protected checkAndAddToProcessed(content: string, processedChunks: Set<string>): boolean {
    const normalized = content.trim();
    if (processedChunks.has(normalized)) {
      return false;
    }
    processedChunks.add(normalized);
    return true;
  }

  /**
   * Validate that the line at startRow exists
   * @param lines - Array of file lines
   * @param startRow - Row to validate
   * @returns true if line exists, false otherwise
   */
  protected validateLineExists(lines: string[], startRow: number): boolean {
    return lines[startRow] !== undefined;
  }

  /**
   * Extract lines from a range and validate
   * @param lines - Array of file lines
   * @param startRow - Starting row
   * @param endRow - Ending row
   * @returns Array of selected lines, or null if invalid
   */
  protected extractLines(lines: string[], startRow: number, endRow: number): string[] | null {
    if (!this.validateLineExists(lines, startRow)) {
      return null;
    }
    const selectedLines = lines.slice(startRow, endRow + 1);
    return selectedLines.length > 0 ? selectedLines : null;
  }

  /**
   * Create a ParseResult with null content
   */
  protected createNullResult(): ParseResult {
    return { content: null };
  }

  /**
   * Create a ParseResult with content
   * @param content - The content to include
   * @param processedSignatures - Optional set of processed signatures
   */
  protected createResult(content: string, processedSignatures?: Set<string>): ParseResult {
    return { content, processedSignatures };
  }
}
