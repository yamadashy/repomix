import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { TokenCounter } from './TokenCounter.js';

/**
 * Calculate token count for git logs if included
 */
export const calculateGitLogMetrics = async (
  config: RepomixConfigMerged,
  gitLogResult: GitLogResult | undefined,
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

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git log token calculation on main thread');

    const counter = new TokenCounter(config.tokenCount.encoding);
    const result = counter.countTokens(gitLogResult.logContent);

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
  }
};
