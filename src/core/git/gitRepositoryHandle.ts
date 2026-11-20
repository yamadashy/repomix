import { getErrorMessage } from '../../shared/errorHandle.js';
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
    logger.trace('Failed to get file change counts:', getErrorMessage(error));
    return {};
  }
};

export const isGitRepository = async (
  directory: string,
  deps = {
    execGitRevParse,
  },
): Promise<boolean> => {
  try {
    await deps.execGitRevParse(directory);
    return true;
  } catch {
    return false;
  }
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
    logger.trace('Git is not installed:', getErrorMessage(error));
    return false;
  }
};
