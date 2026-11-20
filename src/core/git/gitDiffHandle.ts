import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { getErrorMessage, RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitDiff } from './gitCommand.js';
import { isGitRepository } from './gitRepositoryHandle.js';

export interface GitDiffResult {
  workTreeDiffContent: string;
  stagedDiffContent: string;
}

export const getWorkTreeDiff = async (
  directory: string,
  deps = {
    execGitDiff,
    isGitRepository,
  },
): Promise<string> => {
  return getDiff(directory, [], deps);
};

export const getStagedDiff = async (
  directory: string,
  deps = {
    execGitDiff,
    isGitRepository,
  },
): Promise<string> => {
  return getDiff(directory, ['--cached'], deps);
};

/**
 * Helper function to get git diff with common repository check and error handling
 */
const getDiff = async (
  directory: string,
  options: string[],
  deps = {
    execGitDiff,
    isGitRepository,
  },
): Promise<string> => {
  try {
    // Check if the directory is a git repository
    const isGitRepo = await deps.isGitRepository(directory);
    if (!isGitRepo) {
      logger.trace('Not a git repository, skipping diff generation');
      return '';
    }

    // Get the diff with provided options
    const result = await deps.execGitDiff(directory, options);

    return result;
  } catch (error) {
    logger.trace('Failed to get git diff:', getErrorMessage(error));
    return '';
  }
};

export const getGitDiffs = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    getWorkTreeDiff,
    getStagedDiff,
  },
): Promise<GitDiffResult | undefined> => {
  // Get git diffs if enabled
  let gitDiffResult: GitDiffResult | undefined;

  if (config.output.git?.includeDiffs) {
    try {
      // Use the first directory as the git repository root
      // Usually this would be the root of the project
      const gitRoot = rootDirs[0] || config.cwd;
      const [workTreeDiffContent, stagedDiffContent] = await Promise.all([
        deps.getWorkTreeDiff(gitRoot),
        deps.getStagedDiff(gitRoot),
      ]);

      gitDiffResult = {
        workTreeDiffContent,
        stagedDiffContent,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new RepomixError(`Failed to get git diffs: ${error.message}`);
      }
    }
  }

  return gitDiffResult;
};
