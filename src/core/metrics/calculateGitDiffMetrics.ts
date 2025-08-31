import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitDiffMetricsTask } from './workers/gitDiffMetricsWorker.js';

/**
 * Calculate token count for git diffs if included
 */
export const calculateGitDiffMetrics = async (
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  deps = {
    initTaskRunner,
  },
): Promise<number> => {
  if (!config.output.git?.includeDiffs || !gitDiffResult) {
    return 0;
  }

  // Check if we have any diff content to process
  if (!gitDiffResult.workTreeDiffContent && !gitDiffResult.stagedDiffContent) {
    return 0;
  }

  const taskRunner = deps.initTaskRunner<GitDiffMetricsTask, number>(
    1, // Single task for git diff calculation
    new URL('./workers/gitDiffMetricsWorker.js', import.meta.url).href,
    config.worker,
  );

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git diff token calculation using worker');

    const result = await taskRunner.run({
      workTreeDiffContent: gitDiffResult.workTreeDiffContent,
      stagedDiffContent: gitDiffResult.stagedDiffContent,
      encoding: config.tokenCount.encoding,
    });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Git diff token calculation completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during git diff token calculation:', error);
    throw error;
  } finally {
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};
