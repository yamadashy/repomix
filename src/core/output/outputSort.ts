import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { getFileChangeCount } from '../git/gitRepositoryHandle.js';

// Promise-based cache for git file change counts.
// Stores the in-flight promise so concurrent callers (pre-fetch + sortOutputFiles)
// share the same git subprocess instead of spawning duplicates.
// Key format: `${cwd}:${maxCommits}`
// Bounded to 16 entries to prevent unbounded memory growth in long-running processes (MCP server).
const MAX_CACHE_SIZE = 16;
const fileChangeCountsCache = new Map<string, Promise<Record<string, number> | null>>();

const buildCacheKey = (cwd: string, maxCommits: number | undefined): string => {
  return `${cwd}:${maxCommits ?? 'default'}`;
};

export interface SortDeps {
  getFileChangeCount: typeof getFileChangeCount;
}

/**
 * Get file change counts from cache or git log.
 * Returns null if the command fails (e.g., git not installed or not a git repo).
 * Uses a promise cache so concurrent callers share the same git subprocess.
 */
const getFileChangeCounts = (
  cwd: string,
  maxCommits: number | undefined,
  deps: SortDeps,
): Promise<Record<string, number> | null> => {
  const cacheKey = buildCacheKey(cwd, maxCommits);

  // Check cache first — returns the in-flight or resolved promise
  const cached = fileChangeCountsCache.get(cacheKey);
  if (cached) {
    logger.trace('Using cached git file change counts (promise)');
    return cached;
  }

  // Create and cache the promise immediately, before awaiting.
  // This ensures concurrent callers get the same promise.
  const promise = (async () => {
    try {
      const fileChangeCounts = await deps.getFileChangeCount(cwd, maxCommits);

      // Empty result means git log failed (no git, not a repo, etc.)
      if (Object.keys(fileChangeCounts).length === 0) {
        return null;
      }

      logger.trace('Git File change counts max commits:', maxCommits);
      logger.trace('Git File change counts:', fileChangeCounts);

      return fileChangeCounts;
    } catch {
      return null;
    }
  })();

  // Evict oldest entry if cache is full (simple FIFO — Map preserves insertion order)
  if (fileChangeCountsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = fileChangeCountsCache.keys().next().value;
    if (oldestKey !== undefined) {
      fileChangeCountsCache.delete(oldestKey);
    }
  }

  fileChangeCountsCache.set(cacheKey, promise);

  return promise;
};

/**
 * Pre-fetch git file change counts and populate the module-level promise cache.
 * Call this early in the pipeline (alongside git diff/log) so the git subprocess
 * runs in parallel with file search + collection. When sortOutputFiles is called
 * later, it awaits the same promise instead of spawning a new subprocess.
 *
 * Fire-and-forget safe — errors are caught inside getFileChangeCounts.
 */
export const prefetchFileChangeCounts = (
  cwd: string,
  maxCommits: number | undefined,
  deps: SortDeps = { getFileChangeCount },
): void => {
  // Start the git subprocess and store the promise in the cache.
  // No await needed — the promise is cached for later consumption.
  getFileChangeCounts(cwd, maxCommits, deps);
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
