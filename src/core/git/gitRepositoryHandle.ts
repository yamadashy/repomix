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

// Deduplicate concurrent isGitRepository calls for the same directory.
// During the pack pipeline, getGitDiffs and getGitLogs both call isGitRepository
// in parallel for the same gitRoot. Without deduplication, this spawns 3 separate
// `git rev-parse` subprocesses. With deduplication, only 1 subprocess is spawned
// and all concurrent callers share the same Promise. The inflight entry is removed
// after the promise resolves so that subsequent (non-concurrent) calls re-check,
// which is necessary for testability with different mocks.
const isGitRepositoryInflight = new Map<string, Promise<boolean>>();

export const isGitRepository = async (
  directory: string,
  deps = {
    execGitRevParse,
  },
): Promise<boolean> => {
  const inflight = isGitRepositoryInflight.get(directory);
  if (inflight) {
    return inflight;
  }

  const promise = (async () => {
    try {
      await deps.execGitRevParse(directory);
      return true;
    } catch {
      return false;
    } finally {
      isGitRepositoryInflight.delete(directory);
    }
  })();

  isGitRepositoryInflight.set(directory, promise);
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
