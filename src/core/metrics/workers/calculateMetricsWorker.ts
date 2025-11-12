import type { TiktokenEncoding } from 'tiktoken';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Simple token counting worker for metrics calculation.
 *
 * This worker provides a focused interface for counting tokens from text content,
 * using the Tiktoken encoding. All complex metric calculation logic is handled
 * by the calling side to maintain separation of concerns.
 */

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface TokenCountTask {
  content: string;
  encoding: TiktokenEncoding;
  path?: string;
}

export interface TokenCountPairTask {
  originalContent: string;
  truncatedContent: string;
  encoding: TiktokenEncoding;
  path?: string;
}

export const countTokens = async (task: TokenCountTask): Promise<number> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = getTokenCounter(task.encoding);
    const tokenCount = counter.countTokens(task.content, task.path);

    logger.trace(`Counted tokens. Count: ${tokenCount}. Took: ${getProcessDuration(processStartAt)}ms`);
    return tokenCount;
  } catch (error) {
    logger.error('Error in token counting worker:', error);
    throw error;
  }
};

export const countTokensPair = async (task: TokenCountPairTask): Promise<{ original: number; truncated: number }> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = getTokenCounter(task.encoding);
    const tokenCounts = counter.countTokensPair(task.originalContent, task.truncatedContent, task.path);

    logger.trace(
      `Counted token pair. Original: ${tokenCounts.original}, Truncated: ${tokenCounts.truncated}. Took: ${getProcessDuration(processStartAt)}ms`,
    );
    return tokenCounts;
  } catch (error) {
    logger.error('Error in token counting worker:', error);
    throw error;
  }
};

const getProcessDuration = (startTime: bigint): string => {
  const endTime = process.hrtime.bigint();
  return (Number(endTime - startTime) / 1e6).toFixed(2);
};

export default async (
  task: TokenCountTask | TokenCountPairTask,
): Promise<number | { original: number; truncated: number }> => {
  if ('originalContent' in task && 'truncatedContent' in task) {
    return countTokensPair(task as TokenCountPairTask);
  }
  return countTokens(task as TokenCountTask);
};

export const countTokensPairWorker = countTokensPair;

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = () => {
  freeTokenCounters();
};
