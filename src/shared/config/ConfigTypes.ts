/**
 * Configuration type definitions
 */
import { z } from 'zod';

/**
 * File search configuration
 */
export interface FileSearchConfig {
  /**
   * Include patterns
   */
  include?: string[];
  
  /**
   * Exclude patterns
   */
  exclude?: string[];
  
  /**
   * Whether to follow symlinks
   */
  followSymlinks?: boolean;
  
  /**
   * Maximum depth to search
   */
  maxDepth?: number;
}

/**
 * Git diff configuration
 */
export interface GitDiffConfig {
  /**
   * Whether to include git diffs
   */
  includeGitDiffs: boolean;
  
  /**
   * Number of context lines to include
   */
  contextLines?: number;
}

/**
 * Output generator context
 */
export interface OutputGeneratorContext {
  /**
   * Generation date
   */
  generationDate: string;
  
  /**
   * Tree string representation
   */
  treeString: string;
  
  /**
   * Processed files
   */
  processedFiles: Array<{
    path: string;
    content: string;
  }>;
  
  /**
   * Configuration
   */
  config: Record<string, unknown>;
  
  /**
   * Instruction
   */
  instruction: string;
  
  /**
   * Git diff result
   */
  gitDiffResult?: {
    workTreeDiffContent: string;
    stagedDiffContent: string;
  };
}
