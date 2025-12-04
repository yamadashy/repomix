import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

/**
 * Calculate token count for git logs if included
 */
export const calculateGitLogMetrics = async (
  config: RepomixConfigMerged,
  gitLogResult: GitLogResult | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<{ gitLogTokenCount: number }> => {
  // Return zero token count if git logs are disabled or no result
  if (!config.output.git?.includeLogs || !gitLogResult) {
    return {
      gitLogTokenCount: 0,
    };
  }

  // Return zero token count if no commits to count
  if (!gitLogResult.logCommits || gitLogResult.logCommits.length === 0) {
    return {
      gitLogTokenCount: 0,
    };
  }

  // Serialize logCommits to string for token counting
  // Include graph visualization if present for comprehensive token count
  const graphContent = gitLogResult.graph?.graph || '';
  const commitsContent = JSON.stringify(gitLogResult.logCommits);
  const logContent = graphContent + commitsContent;

  // Return zero token count if no git log content
  if (!logContent) {
    return {
      gitLogTokenCount: 0,
    };
  }

  try {
    const startTime = process.hrtime.bigint();
    logger.trace('Starting git log token calculation using worker');

    const result = await deps.taskRunner.run({
      content: logContent,
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
  }
};
