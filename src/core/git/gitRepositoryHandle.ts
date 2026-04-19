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

// Share in-flight rev-parse promises so concurrent callers against the same
// directory await one subprocess spawn instead of racing their own. Bypassed
// for non-default `deps` so test mocks keep exact call-count semantics.
const isGitRepositoryCache = new Map<string, Promise<boolean>>();

export const clearIsGitRepositoryCache = (): void => {
  isGitRepositoryCache.clear();
};

export const isGitRepository = (
  directory: string,
  deps = {
    execGitRevParse,
  },
): Promise<boolean> => {
  const execRevParse = deps.execGitRevParse;
  const runCheck = async (): Promise<boolean> => {
    try {
      await execRevParse(directory);
      return true;
    } catch {
      return false;
    }
  };

  // Non-default deps means a test mock — bypass cache to keep call-count
  // assertions stable.
  if (execRevParse !== execGitRevParse) {
    return runCheck();
  }

  const cached = isGitRepositoryCache.get(directory);
  if (cached) {
    return cached;
  }

  const pending = runCheck();
  isGitRepositoryCache.set(directory, pending);
  return pending;
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
