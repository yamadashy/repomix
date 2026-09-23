import { logger } from '../../shared/logger.js';
import { isSandboxedProcess } from '../../shared/sandboxEnv.js';
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

export const isGitRepository = async (
  directory: string,
  deps = {
    execGitRevParse,
  },
): Promise<boolean> => {
  // Second git choke point (diffs/logs reach git through here, not isGitInstalled).
  if (isSandboxedProcess()) return false;
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
  // A git child hangs under Windows AppContainer, and git is out of scope for a
  // confined single-workspace pack — report it unavailable so callers skip it.
  if (isSandboxedProcess()) return false;
  try {
    const result = await deps.execGitVersion();
    return !result.includes('error') && result.includes('git version');
  } catch (error) {
    logger.trace('Git is not installed:', (error as Error).message);
    return false;
  }
};
