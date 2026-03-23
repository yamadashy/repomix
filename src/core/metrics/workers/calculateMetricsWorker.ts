import { logger, repomixLogLevels, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenCountEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Token counting worker for metrics calculation.
 *
 * Supports two task types:
 * - TokenCountTask: count tokens for a single content string
 * - BatchTokenCountTask: count tokens for multiple files in one call,
 *   reducing per-task structured clone and message passing overhead
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

// Batch task: count tokens for multiple files in a single worker call.
// Reduces per-task overhead (structured clone, message passing, Promise creation)
// from O(N) to O(batches) — critical when counting 1000+ files.
export interface BatchTokenCountTask {
  files: Array<{ content: string; path: string }>;
  encoding: TokenCountEncoding;
  batch: true; // discriminator for task type inference
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

const countTokensBatch = async (
  task: BatchTokenCountTask,
): Promise<Array<{ path: string; charCount: number; tokenCount: number }>> => {
  const processStartAt = isTracing ? process.hrtime.bigint() : 0n;

  try {
    const counter = await getTokenCounter(task.encoding);
    const results: Array<{ path: string; charCount: number; tokenCount: number }> = [];

    for (const file of task.files) {
      const tokenCount = counter.countTokens(file.content, file.path);
      results.push({ path: file.path, charCount: file.content.length, tokenCount });
    }

    if (isTracing) {
      const endTime = process.hrtime.bigint();
      const duration = (Number(endTime - processStartAt) / 1e6).toFixed(2);
      logger.trace(`Batch counted ${task.files.length} files. Took: ${duration}ms`);
    }
    return results;
  } catch (error) {
    logger.error('Error in batch token counting worker:', error);
    throw error;
  }
};

export default async (
  task: TokenCountTask | BatchTokenCountTask,
): Promise<number | Array<{ path: string; tokenCount: number }>> => {
  if ('batch' in task && task.batch) {
    return countTokensBatch(task as BatchTokenCountTask);
  }
  return countTokens(task as TokenCountTask);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
