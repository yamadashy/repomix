import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { initTaskRunner } from '../../shared/processConcurrency.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { GitLogMetricsTask } from './workers/gitLogMetricsWorker.js';

/**
 * Calculate token count for git logs if included
 */
export const calculateGitLogMetrics = async (
  config: RepomixConfigMerged,
  gitLogResult: GitLogResult | undefined,
  deps = {
    initTaskRunner,
  },
): Promise<{ gitLogTokenCount: number }> => {
  // Return zero token count if git logs are disabled or no result
  if (!config.output.git?.includeLogs || !gitLogResult) {
    return {
      gitLogTokenCount: 0,
    };
  }

  // Return zero token count if no git log content
  if (!gitLogResult.logContent) {
    return {
      gitLogTokenCount: 0,
    };
  }

  const taskRunner = deps.initTaskRunner<GitLogMetricsTask, number>(
    1, // Single task for git log calculation
    new URL('./workers/gitLogMetricsWorker.js', import.meta.url).href,
    config.worker,
  );

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git log token calculation using worker');

    const result = await taskRunner.run({
      content: gitLogResult.logContent,
      encoding: config.tokenCount.encoding,
    });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Git log token calculation completed in ${duration.toFixed(2)}ms`);

    return {
      gitLogTokenCount: result,
    };
  } catch (error) {
    logger.error('Failed to calculate git log metrics:', error);
    return {
      gitLogTokenCount: 0,
    };
  } finally {
    await taskRunner.cleanup();
  }
};
