import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { getStagedDiff, getWorkTreeDiff } from './index.js';

export interface GitDiffResult {
  workTreeDiffContent: string;
  stagedDiffContent: string;
}

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
