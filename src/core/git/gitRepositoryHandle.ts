import { logger } from '../../shared/logger.js';
import { execGitLogFilenames, execGitRevParse, execGitVersion } from './gitCommand.js';

const defaultExecGitRevParse = execGitRevParse;

// Cache for isGitRepository results.
// Avoids redundant `git rev-parse` process spawns (~5-10ms each) when
// gitDiffHandle and gitLogHandle both check the same directory concurrently.
const gitRepoCache = new Map<string, Promise<boolean>>();

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
  // Only use cache with default deps (production). When custom deps are injected (tests),
  // skip caching to allow each call to use its own mock.
  const useCache = deps.execGitRevParse === defaultExecGitRevParse;

  if (useCache) {
    // Use Promise cache to deduplicate concurrent checks for the same directory.
    // gitDiffHandle and gitLogHandle both call this for the same dir via Promise.all.
    const cached = gitRepoCache.get(directory);
    if (cached !== undefined) {
      return cached;
    }
  }

  const promise = (async () => {
    try {
      await deps.execGitRevParse(directory);
      return true;
    } catch {
      return false;
    }
  })();

  if (useCache) {
    gitRepoCache.set(directory, promise);
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
