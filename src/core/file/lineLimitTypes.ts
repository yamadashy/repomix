import type { Node, Tree } from 'web-tree-sitter';

/**
 * Represents a line in source file with metadata
 */
export interface SourceLine {
  lineNumber: number;
  content: string;
  section: LineSection;
  importance: number; // 0-1 scale
  nodeType?: string; // Tree-sitter node type
}

/**
 * Classification of line sections
 */
export enum LineSection {
  HEADER = 'header',
  CORE = 'core',
  FOOTER = 'footer',
}

/**
 * Function/method analysis result
 */
export interface FunctionAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  complexity: number;
  lineCount: number;
  isSelected: boolean;
}

/**
 * Line allocation strategy
 */
export interface LineAllocation {
  headerLines: number; // 30% of total limit
  coreLines: number; // 60% of total limit
  footerLines: number; // 10% of total limit
}

/**
 * Line limiting result with metadata
 */
export interface LineLimitResult {
  originalLineCount: number;
  limitedLineCount: number;
  selectedLines: SourceLine[];
  truncatedFunctions: string[];
  truncationIndicators: TruncationIndicator[];
  metadata: LineLimitMetadata;
}

/**
 * Metadata about limiting process
 */
export interface LineLimitMetadata {
  processingTimeMs: number;
  algorithm: string;
  language: string;
  allocation: LineAllocation;
  functionsAnalyzed: number;
  functionsSelected: number;
}

/**
 * Truncation indicator for showing where content was removed
 */
export interface TruncationIndicator {
  position: number; // Line number where indicator is inserted
  type: 'function' | 'class' | 'block';
  description: string;
}

/**
 * Language-specific line limiting strategy
 */
export interface LanguageStrategy {
  identifyHeaderLines(lines: string[], tree: Tree): number[];
  analyzeFunctions(lines: string[], tree: Tree): FunctionAnalysis[];
  identifyFooterLines(lines: string[], tree: Tree): number[];
  calculateComplexity(node: Node): number;
}

/**
 * Registry of language strategies
 */
export interface LanguageStrategyRegistry {
  [language: string]: LanguageStrategy;
}

/**
 * Line limiting configuration options
 */
export interface LineLimitConfig {
  lineLimit: number;
  preserveStructure: boolean;
  showTruncationIndicators: boolean;
  enableCaching: boolean;
}

/**
 * Performance metrics for line limiting
 */
export interface LineLimitMetrics {
  processingTimeMs: number;
  originalLineCount: number;
  limitedLineCount: number;
  compressionRatio: number;
  memoryUsageMB: number;
  cacheHitRate: number;
  errorCount: number;
}

/**
 * Error types for line limiting
 */
export class LineLimitError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly lineLimit: number,
    cause?: Error,
  ) {
    super(message);
    this.name = 'LineLimitError';
    if (cause) {
      this.cause = cause;
    }
  }
}

export class LineLimitTooSmallError extends LineLimitError {
  constructor(filePath: string, lineLimit: number, minimumRequired: number) {
    super(
      `Line limit ${lineLimit} is too small for file ${filePath}. Minimum required: ${minimumRequired}`,
      filePath,
      lineLimit,
    );
    this.name = 'LineLimitTooSmallError';
  }
}

export class LineLimitParseError extends LineLimitError {
  constructor(filePath: string, lineLimit: number, parseError: Error) {
    super(`Failed to parse file ${filePath} for line limiting: ${parseError.message}`, filePath, lineLimit, parseError);
    this.name = 'LineLimitParseError';
  }
}
