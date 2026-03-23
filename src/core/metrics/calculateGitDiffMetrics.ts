import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { TokenCounter } from './TokenCounter.js';

/**
 * Calculate token count for git diffs if included
 */
export const calculateGitDiffMetrics = async (
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  deps: { tokenCounter: TokenCounter },
): Promise<number> => {
  if (!config.output.git?.includeDiffs || !gitDiffResult) {
    return 0;
  }

  // Check if we have any diff content to process
  if (!gitDiffResult.workTreeDiffContent && !gitDiffResult.stagedDiffContent) {
    return 0;
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git diff token calculation on main thread');

    let totalTokens = 0;

    if (gitDiffResult.workTreeDiffContent) {
      totalTokens += deps.tokenCounter.countTokens(gitDiffResult.workTreeDiffContent);
    }
    if (gitDiffResult.stagedDiffContent) {
      totalTokens += deps.tokenCounter.countTokens(gitDiffResult.stagedDiffContent);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Git diff token calculation completed in ${duration.toFixed(2)}ms`);

    return totalTokens;
  } catch (error) {
    logger.error('Error during git diff token calculation:', error);
    throw error;
  }
};
