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

const getProcessDuration = (startTime: bigint): string => {
  const endTime = process.hrtime.bigint();
  return (Number(endTime - startTime) / 1e6).toFixed(2);
};

export default async (task: TokenCountTask): Promise<number> => {
  return countTokens(task);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
