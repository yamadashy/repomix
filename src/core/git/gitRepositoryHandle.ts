import { logger } from '../../shared/logger.js';
import { execGitLogFilenames, execGitRevParse, execGitVersion } from './gitCommand.js';

const isGitRepoCache = new Map<string, Promise<boolean>>();
let isGitInstalledCache: Promise<boolean> | null = null;

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
  const useCache = deps.execGitRevParse === execGitRevParse;

  if (useCache) {
    const cached = isGitRepoCache.get(directory);
    if (cached !== undefined) return cached;
  }

  const result = deps
    .execGitRevParse(directory)
    .then(() => true)
    .catch(() => false);

  if (useCache) {
    isGitRepoCache.set(directory, result);
  }

  return result;
};

export const isGitInstalled = async (
  deps = {
    execGitVersion,
  },
): Promise<boolean> => {
  const useCache = deps.execGitVersion === execGitVersion;

  if (useCache && isGitInstalledCache !== null) {
    return isGitInstalledCache;
  }

  const result = deps
    .execGitVersion()
    .then((output) => !output.includes('error') && output.includes('git version'))
    .catch((error) => {
      logger.trace('Git is not installed:', (error as Error).message);
      return false;
    });

  if (useCache) {
    isGitInstalledCache = result;
  }

  return result;
};

export const _resetCacheForTesting = (): void => {
  isGitRepoCache.clear();
  isGitInstalledCache = null;
};
