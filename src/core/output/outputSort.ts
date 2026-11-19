import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { getFileChangeCount, isGitInstalled } from '../git/gitRepositoryHandle.js';

// Cache for git file change counts to avoid repeated git operations
// Key format: `${cwd}:${maxCommits}`
const fileChangeCountsCache = new Map<string, Record<string, number>>();

// Cache for git availability check per cwd
const gitAvailabilityCache = new Map<string, boolean>();

const buildCacheKey = (cwd: string, maxCommits: number | undefined): string => {
  return `${cwd}:${maxCommits ?? 'default'}`;
};

export interface SortDeps {
  getFileChangeCount: typeof getFileChangeCount;
  isGitInstalled: typeof isGitInstalled;
}

/**
 * Get file change counts from cache or git log.
 * Returns null if git is not available or the command fails.
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

  // Check git availability (cached per cwd)
  const gitAvailable = await checkGitAvailability(cwd, deps);
  if (!gitAvailable) {
    return null;
  }

  // Fetch from git log
  try {
    const fileChangeCounts = await deps.getFileChangeCount(cwd, maxCommits);
    fileChangeCountsCache.set(cacheKey, fileChangeCounts);

    logger.trace('Git File change counts max commits:', maxCommits);
    logger.trace('Git File change counts:', fileChangeCounts);

    return fileChangeCounts;
  } catch {
    return null;
  }
};

/**
 * Check if git is available in the given directory.
 * Results are cached per cwd.
 */
const checkGitAvailability = async (cwd: string, deps: SortDeps): Promise<boolean> => {
  const cached = gitAvailabilityCache.get(cwd);
  if (cached !== undefined) {
    return cached;
  }

  // Check if Git is installed
  const gitInstalled = await deps.isGitInstalled();
  if (!gitInstalled) {
    logger.trace('Git is not installed');
    gitAvailabilityCache.set(cwd, false);
    return false;
  }

  // Check if .git directory exists
  const gitFolderPath = path.resolve(cwd, '.git');
  try {
    await fs.access(gitFolderPath);
    gitAvailabilityCache.set(cwd, true);
    return true;
  } catch {
    logger.trace('Git folder not found');
    gitAvailabilityCache.set(cwd, false);
    return false;
  }
};

// Sort files by git change count for output
export const sortOutputFiles = async (
  files: ProcessedFile[],
  config: RepomixConfigMerged,
  deps: SortDeps = {
    getFileChangeCount,
    isGitInstalled,
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

/**
 * Forget what an earlier pack run cached for this directory.
 *
 * The caches live for the process, which is right for a one-shot CLI run and wrong
 * for the MCP server: it runs the CLI once per tool call from a single long-lived
 * process, so the counts a second `pack_codebase` used were the ones the first one
 * read — however many commits landed in between — and files kept the order of a
 * history that no longer existed. Same shape as the logger level the MCP runtime
 * already restores per call.
 */
const clearSortCaches = (cwd: string): void => {
  const prefix = `${cwd}:`;
  for (const key of fileChangeCountsCache.keys()) {
    if (key.startsWith(prefix)) fileChangeCountsCache.delete(key);
  }
  gitAvailabilityCache.delete(cwd);
};

/**
 * Pre-fetch git file change counts so that a later `sortOutputFiles` call
 * hits the in-memory cache instead of spawning git subprocesses on the
 * critical path. Called once at the start of a pack run, which is also where the
 * previous run's counts are dropped.
 */
export const prefetchSortData = async (
  config: RepomixConfigMerged,
  deps: SortDeps = {
    getFileChangeCount,
    isGitInstalled,
  },
): Promise<void> => {
  if (!config.output.git?.sortByChanges) return;
  clearSortCaches(config.cwd);
  await getFileChangeCounts(config.cwd, config.output.git?.sortByChangesMaxCommits, deps);
};

const sortFilesByChangeCounts = (files: ProcessedFile[], fileChangeCounts: Record<string, number>): ProcessedFile[] => {
  // Sort files by change count (files with more changes go to the bottom)
  return [...files].sort((a, b) => {
    const countA = fileChangeCounts[a.path] || 0;
    const countB = fileChangeCounts[b.path] || 0;
    return countA - countB;
  });
};
