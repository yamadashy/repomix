import { logger } from '../../shared/logger.js';
import { execGitLogFilenames, execGitRevParse, execGitVersion } from './gitCommand.js';

// Cache isGitRepository results per directory to avoid redundant git rev-parse calls.
// When diffs and logs are both enabled, isGitRepository is called 3 times for the same
// directory (getWorkTreeDiff, getStagedDiff, getGitLog). Caching reduces this to 1 call.
const gitRepoCache = new Map<string, Promise<boolean>>();

/** Clear the isGitRepository cache (for testing only). */
export const clearGitRepoCache = (): void => {
  gitRepoCache.clear();
};

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

export const isGitRepository = async (
  directory: string,
  deps = {
    execGitRevParse,
  },
): Promise<boolean> => {
  const cached = gitRepoCache.get(directory);
  if (cached !== undefined) {
    return cached;
  }

  const promise = deps.execGitRevParse(directory).then(
    () => true,
    () => false,
  );
  gitRepoCache.set(directory, promise);
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
