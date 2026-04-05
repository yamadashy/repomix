import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { TokenCountBatchTask } from './workers/calculateMetricsWorker.js';

/**
 * Calculate token count for git diffs if included
 */
export const calculateGitDiffMetrics = async (
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  deps: { taskRunner: TaskRunner<TokenCountBatchTask, number[]> },
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

    const items: { content: string; encoding: typeof config.tokenCount.encoding }[] = [];

    if (gitDiffResult.workTreeDiffContent) {
      items.push({
        content: gitDiffResult.workTreeDiffContent,
        encoding: config.tokenCount.encoding,
      });
    }
    if (gitDiffResult.stagedDiffContent) {
      items.push({
        content: gitDiffResult.stagedDiffContent,
        encoding: config.tokenCount.encoding,
      });
    }

    const results = await deps.taskRunner.run({ items });
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
