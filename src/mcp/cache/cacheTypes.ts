/**
 * Types for Monorepo Submodule Caching
 */

import { z } from 'zod';

/**
 * Schema for cache metadata validation
 */
export const CacheMetadataSchema = z.object({
  submodule: z.string().describe('Submodule name'),
  generatedAt: z.string().describe('When the cache was generated'),
  gitCommit: z.string().describe('Git commit hash when cache was generated'),
  fileCount: z.number().int().nonnegative().describe('Number of files in the submodule'),
  tokenCount: z.number().int().nonnegative().describe('Total token count of the content'),
  dependencies: z.array(z.string()).describe('List of dependencies (other submodule names)'),
  repomixVersion: z.string().describe('Repomix version used to generate'),
  compressed: z.boolean().describe('Whether compression was enabled'),
  isGitSubmodule: z.boolean().optional().describe('Whether this is a git submodule'),
});

/**
 * Metadata stored alongside cached content
 */
export interface CacheMetadata {
  /** Submodule name */
  submodule: string;

  /** When the cache was generated */
  generatedAt: string;

  /** Git commit hash when cache was generated */
  gitCommit: string;

  /** Number of files in the submodule */
  fileCount: number;

  /** Total token count of the content */
  tokenCount: number;

  /** List of dependencies (other submodule names) */
  dependencies: string[];

  /** Repomix version used to generate */
  repomixVersion: string;

  /** Whether compression was enabled */
  compressed: boolean;

  /** Whether this is a git submodule */
  isGitSubmodule?: boolean;
}

/**
 * Cached content with metadata
 */
export interface CachedContent {
  /** The packed content */
  content: string;

  /** Cache metadata */
  meta: CacheMetadata;
}

/**
 * Result of cache check
 */
export interface CacheCheckResult {
  /** Whether cache exists */
  exists: boolean;

  /** Whether cache is valid (not expired) */
  valid: boolean;

  /** Metadata if cache exists */
  meta?: CacheMetadata;

  /** Reason if cache is invalid */
  invalidReason?: string;
}

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Force regenerate even if cache exists */
  forceRegenerate?: boolean;

  /** Whether to use compression */
  compress?: boolean;
}
