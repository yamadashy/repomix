import { logger, repomixLogLevels, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenCountEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Simple token counting worker for metrics calculation.
 *
 * This worker provides a focused interface for counting tokens from text content.
 * All complex metric calculation logic is handled by the calling side.
 */

// Initialize logger configuration from workerData at module load time
setLogLevelByWorkerData();

// Cache log level check to avoid per-task overhead (trace logs use DEBUG level)
const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;

export interface TokenCountTask {
  content: string;
  encoding: TokenCountEncoding;
  path?: string;
}

export const countTokens = async (task: TokenCountTask): Promise<number> => {
  const processStartAt = isTracing ? process.hrtime.bigint() : 0n;

  try {
    const counter = await getTokenCounter(task.encoding);
    const tokenCount = counter.countTokens(task.content, task.path);

    if (isTracing) {
      const endTime = process.hrtime.bigint();
      const duration = (Number(endTime - processStartAt) / 1e6).toFixed(2);
      logger.trace(`Counted tokens. Count: ${tokenCount}. Took: ${duration}ms`);
    }
    return tokenCount;
  } catch (error) {
    logger.error('Error in token counting worker:', error);
    throw error;
  }
};

export default async (task: TokenCountTask): Promise<number> => {
  return countTokens(task);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
