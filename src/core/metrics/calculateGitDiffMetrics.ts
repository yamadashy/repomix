import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import { getTokenCounter } from './tokenCounterFactory.js';

const defaultDeps = {
  getTokenCounter,
};

/**
 * Calculate token count for git diffs if included
 */
export const calculateGitDiffMetrics = async (
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  deps: Partial<typeof defaultDeps> = {},
): Promise<number> => {
  if (!config.output.git?.includeDiffs || !gitDiffResult) {
    return 0;
  }

  if (!gitDiffResult.workTreeDiffContent && !gitDiffResult.stagedDiffContent) {
    return 0;
  }

  const resolvedDeps = { ...defaultDeps, ...deps };

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git diff token calculation on main thread');

    const counter = await resolvedDeps.getTokenCounter(config.tokenCount.encoding);
    let totalTokens = 0;

    if (gitDiffResult.workTreeDiffContent) {
      totalTokens += counter.countTokensPlainText(gitDiffResult.workTreeDiffContent);
    }
    if (gitDiffResult.stagedDiffContent) {
      totalTokens += counter.countTokensPlainText(gitDiffResult.stagedDiffContent);
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
