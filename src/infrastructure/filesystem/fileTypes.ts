/**
 * Types for file system operations
 */

/**
 * Represents a raw file with path and content
 */
export interface RawFile {
  path: string;
  content: string;
}

/**
 * Represents a processed file with path and content
 */
export interface ProcessedFile {
  path: string;
  content: string;
}
