import { logger } from '../../shared/logger.js';
import { execGitLogFilenames, execGitRevParse, execGitVersion } from './gitCommand.js';

export const getFileChangeCount = async (
  directory: string,
  maxCommits = 100,
  deps = {
    execGitLogFilenames,
  },
): Promise<Record<string, number>> => {
  try {
    const filenames = await deps.execGitLogFilenames(directory, maxCommits);

    const fileChangeCounts: Record<string, number> = {};

    for (const filename of filenames) {
      fileChangeCounts[filename] = (fileChangeCounts[filename] || 0) + 1;
    }

    return fileChangeCounts;
  } catch (error) {
    logger.trace('Failed to get file change counts:', (error as Error).message);
    return {};
  }
};

// Promise-based cache to deduplicate concurrent isGitRepository calls
// (e.g., when getGitDiffs and getGitLogs run in parallel via Promise.all)
const isGitRepoCache = new Map<string, Promise<boolean>>();

export const isGitRepository = async (
  directory: string,
  deps = {
    execGitRevParse,
  },
): Promise<boolean> => {
  // Only use cache with default deps (skip for test mocks)
  const useCache = deps.execGitRevParse === execGitRevParse;

  if (useCache) {
    const cached = isGitRepoCache.get(directory);
    if (cached) {
      return cached;
    }
  }

  const promise = deps.execGitRevParse(directory).then(
    () => true,
    () => false,
  );

  if (useCache) {
    isGitRepoCache.set(directory, promise);
  }

  return promise;
};

export const isGitInstalled = async (
  deps = {
    execGitVersion,
  },
): Promise<boolean> => {
  try {
    const result = await deps.execGitVersion();
    return !result.includes('error') && result.includes('git version');
  } catch (error) {
    logger.trace('Git is not installed:', (error as Error).message);
    return false;
  }
};
