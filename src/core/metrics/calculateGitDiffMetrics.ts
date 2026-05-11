import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import { countTokensWithCache, type MetricsTaskRunner } from './metricsWorkerRunner.js';

/**
 * Calculate token count for git diffs if included
 */
export const calculateGitDiffMetrics = async (
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  deps: { taskRunner: MetricsTaskRunner },
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

    // Probe the in-memory token-count cache on the main thread before each
    // potential worker round-trip. Diff content is byte-stable across repeat
    // runs unless the working tree / index changes, and the content-addressed
    // key (MD5 of content) auto-invalidates when the diff changes. Persisted
    // across runs via saveTokenCountCache(), so the savings carry over to a
    // fresh CLI invocation as well.
    const countPromises: Promise<number>[] = [];

    if (gitDiffResult.workTreeDiffContent) {
      countPromises.push(
        countTokensWithCache(gitDiffResult.workTreeDiffContent, config.tokenCount.encoding, deps.taskRunner),
      );
    }
    if (gitDiffResult.stagedDiffContent) {
      countPromises.push(
        countTokensWithCache(gitDiffResult.stagedDiffContent, config.tokenCount.encoding, deps.taskRunner),
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
