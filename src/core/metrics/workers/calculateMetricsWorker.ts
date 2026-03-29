import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Simple token counting worker for metrics calculation.
 *
 * This worker provides a focused interface for counting tokens from text content,
 * using gpt-tokenizer. All complex metric calculation logic is handled
 * by the calling side to maintain separation of concerns.
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
  batch: { content: string; path?: string }[];
  encoding: TokenEncoding;
}

export type TokenCountWorkerTask = TokenCountTask | TokenCountBatchTask;
export type TokenCountWorkerResult = number | number[];

const isBatchTask = (task: TokenCountWorkerTask): task is TokenCountBatchTask => {
  return 'batch' in task;
};

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

export const countTokensBatch = async (task: TokenCountBatchTask): Promise<number[]> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = await getTokenCounter(task.encoding);
    const results: number[] = [];

    for (const item of task.batch) {
      results.push(counter.countTokens(item.content, item.path));
    }

    logger.trace(`Batch counted ${task.batch.length} items. Took: ${getProcessDuration(processStartAt)}ms`);
    return results;
  } catch (error) {
    logger.error('Error in token counting worker (batch):', error);
    throw error;
  }
};

const getProcessDuration = (startTime: bigint): string => {
  const endTime = process.hrtime.bigint();
  return (Number(endTime - startTime) / 1e6).toFixed(2);
};

export default async (task: TokenCountWorkerTask): Promise<TokenCountWorkerResult> => {
  if (isBatchTask(task)) {
    return countTokensBatch(task);
  }
  return countTokens(task);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
