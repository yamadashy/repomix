import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

/**
 * Calculate token count for git diffs if included
 */
export const calculateGitDiffMetrics = async (
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
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
    logger.trace('Starting git diff token calculation using worker');

    const countPromises: Promise<number>[] = [];

    if (gitDiffResult.workTreeDiffContent) {
      countPromises.push(
        deps.taskRunner.run({
          content: gitDiffResult.workTreeDiffContent,
          encoding: config.tokenCount.encoding,
        }),
      );
    }
    if (gitDiffResult.stagedDiffContent) {
      countPromises.push(
        deps.taskRunner.run({
          content: gitDiffResult.stagedDiffContent,
          encoding: config.tokenCount.encoding,
        }),
      );
    }

    const results = await Promise.all(countPromises);
    const totalTokens = results.reduce((sum, count) => sum + count, 0);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Git diff token calculation completed in ${duration.toFixed(2)}ms`);

    return totalTokens;
  } catch (error) {
    logger.error('Error during git diff token calculation:', error);
    throw error;
  }
};
