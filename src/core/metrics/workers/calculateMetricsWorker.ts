import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Token counting worker for metrics calculation.
 *
 * Supports both single-file and batch modes. Batch mode reduces worker thread
 * round-trip overhead by processing multiple files per task dispatch.
 */

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface TokenCountTask {
  content: string;
  encoding: TokenEncoding;
  path?: string;
}

export interface TokenCountBatchTask {
  batch: Array<{ content: string; path?: string }>;
  encoding: TokenEncoding;
}

export interface TokenCountBatchResult {
  tokenCounts: number[];
}

export const countTokens = async (task: TokenCountTask): Promise<number> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = await getTokenCounter(task.encoding);
    const tokenCount = counter.countTokens(task.content, task.path);

    logger.trace(`Counted tokens. Count: ${tokenCount}. Took: ${getProcessDuration(processStartAt)}ms`);
    return tokenCount;
  } catch (error) {
    logger.error('Error in token counting worker:', error);
    throw error;
  }
};

export const countTokensBatch = async (task: TokenCountBatchTask): Promise<TokenCountBatchResult> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = await getTokenCounter(task.encoding);
    const tokenCounts = task.batch.map((item) => counter.countTokens(item.content, item.path));

    logger.trace(`Batch counted ${task.batch.length} files. Took: ${getProcessDuration(processStartAt)}ms`);
    return { tokenCounts };
  } catch (error) {
    logger.error('Error in batch token counting worker:', error);
    throw error;
  }
};

const getProcessDuration = (startTime: bigint): string => {
  const endTime = process.hrtime.bigint();
  return (Number(endTime - startTime) / 1e6).toFixed(2);
};

export default async (task: TokenCountTask | TokenCountBatchTask): Promise<number | TokenCountBatchResult> => {
  if ('batch' in task) {
    return countTokensBatch(task);
  }
  return countTokens(task);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
