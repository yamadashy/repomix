import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { countTokensWithCache, type MetricsTaskRunner } from './metricsWorkerRunner.js';

/**
 * Calculate token count for git logs if included
 */
export const calculateGitLogMetrics = async (
  config: RepomixConfigMerged,
  gitLogResult: GitLogResult | undefined,
  deps: { taskRunner: MetricsTaskRunner },
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
    logger.trace('Starting git log token calculation using worker');

    // Probe the in-memory token-count cache on the main thread before paying
    // the worker round-trip. The git log content is byte-stable across runs
    // unless new commits land, and the content-addressed key (MD5 of content)
    // auto-invalidates when the log changes. Persisted across runs via
    // saveTokenCountCache(), so a fresh CLI invocation also benefits.
    const result = await countTokensWithCache(gitLogResult.logContent, config.tokenCount.encoding, deps.taskRunner);

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
