import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { getTokenCounter } from './tokenCounterFactory.js';

const defaultDeps = {
  getTokenCounter,
};

/**
 * Calculate token count for git logs if included
 */
export const calculateGitLogMetrics = async (
  config: RepomixConfigMerged,
  gitLogResult: GitLogResult | undefined,
  deps: Partial<typeof defaultDeps> = {},
): Promise<{ gitLogTokenCount: number }> => {
  if (!config.output.git?.includeLogs || !gitLogResult) {
    return { gitLogTokenCount: 0 };
  }

  if (!gitLogResult.logContent) {
    return { gitLogTokenCount: 0 };
  }

  const resolvedDeps = { ...defaultDeps, ...deps };

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git log token calculation on main thread');

    const counter = await resolvedDeps.getTokenCounter(config.tokenCount.encoding);
    let result = counter.countTokens(gitLogResult.logContent);
    if (result === 0 && gitLogResult.logContent.length > 0) {
      result = counter.countTokensPlainText(gitLogResult.logContent);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Git log token calculation completed in ${duration.toFixed(2)}ms`);

    return { gitLogTokenCount: result };
  } catch (error) {
    logger.error('Failed to calculate git log metrics:', error);
    return { gitLogTokenCount: 0 };
  }
};
