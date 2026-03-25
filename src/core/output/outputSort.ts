import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { getFileChangeCount } from '../git/gitRepositoryHandle.js';

// Cache for git file change counts to avoid repeated git operations
// Key format: `${cwd}:${maxCommits}`
const fileChangeCountsCache = new Map<string, Record<string, number>>();

const buildCacheKey = (cwd: string, maxCommits: number | undefined): string => {
  return `${cwd}:${maxCommits ?? 'default'}`;
};

export interface SortDeps {
  getFileChangeCount: typeof getFileChangeCount;
}

/**
 * Get file change counts from cache or git log.
 * Returns null if the command fails (e.g., git not installed or not a git repo).
 * Errors are caught by getFileChangeCount, so no pre-check needed.
 */
const getFileChangeCounts = async (
  cwd: string,
  maxCommits: number | undefined,
  deps: SortDeps,
): Promise<Record<string, number> | null> => {
  const cacheKey = buildCacheKey(cwd, maxCommits);

  // Check cache first
  const cached = fileChangeCountsCache.get(cacheKey);
  if (cached) {
    logger.trace('Using cached git file change counts');
    return cached;
  }

  // Fetch from git log directly — getFileChangeCount already catches errors
  // and returns {} on failure (git not installed, not a repo, etc.).
  // This eliminates a redundant `git --version` subprocess spawn (~5ms Linux, ~50ms Windows)
  // and `fs.access('.git')` check that were previously done as a pre-check.
  try {
    const fileChangeCounts = await deps.getFileChangeCount(cwd, maxCommits);

    // Empty result means git log failed (no git, not a repo, etc.)
    if (Object.keys(fileChangeCounts).length === 0) {
      return null;
    }

    fileChangeCountsCache.set(cacheKey, fileChangeCounts);

    logger.trace('Git File change counts max commits:', maxCommits);
    logger.trace('Git File change counts:', fileChangeCounts);

    return fileChangeCounts;
  } catch {
    return null;
  }
};

// Sort files by git change count for output
export const sortOutputFiles = async (
  files: ProcessedFile[],
  config: RepomixConfigMerged,
  deps: SortDeps = {
    getFileChangeCount,
  },
): Promise<ProcessedFile[]> => {
  if (!config.output.git?.sortByChanges) {
    logger.trace('Git sort is not enabled');
    return files;
  }

  const fileChangeCounts = await getFileChangeCounts(config.cwd, config.output.git?.sortByChangesMaxCommits, deps);

  if (!fileChangeCounts) {
    return files;
  }

  return sortFilesByChangeCounts(files, fileChangeCounts);
};

const sortFilesByChangeCounts = (files: ProcessedFile[], fileChangeCounts: Record<string, number>): ProcessedFile[] => {
  // Sort files by change count (files with more changes go to the bottom).
  // slice() creates a shallow copy more efficiently than spread [...files]
  // by pre-allocating the correct array size instead of iterating the spread.
  return files.slice().sort((a, b) => {
    const countA = fileChangeCounts[a.path] || 0;
    const countB = fileChangeCounts[b.path] || 0;
    return countA - countB;
  });
};
