import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Token counting worker for metrics calculation.
 *
 * Supports both single-content and batch modes. Batch mode reduces IPC overhead
 * by processing multiple files per worker round-trip (~2ms minimum per round-trip,
 * dominated by tinypool serialization and dispatch).
 * For ~1000 files, batching with size 50 reduces round-trips from ~1000 to ~20.
 */

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface TokenCountTask {
  content: string;
  encoding: TokenEncoding;
  path?: string;
}

export interface TokenCountBatchItem {
  content: string;
  path?: string;
}

export interface TokenCountBatchTask {
  items: TokenCountBatchItem[];
  encoding: TokenEncoding;
}

export type MetricsWorkerTask = TokenCountTask | TokenCountBatchTask;
export type MetricsWorkerResult = number | number[];

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

const countTokensBatch = async (task: TokenCountBatchTask): Promise<number[]> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = await getTokenCounter(task.encoding);
    const results = task.items.map((item) => counter.countTokens(item.content, item.path));

    logger.trace(`Counted tokens for ${task.items.length} items. Took: ${getProcessDuration(processStartAt)}ms`);
    return results;
  } catch (error) {
    logger.error('Error in batch token counting worker:', error);
    throw error;
  }
};

const getProcessDuration = (startTime: bigint): string => {
  const endTime = process.hrtime.bigint();
  return (Number(endTime - startTime) / 1e6).toFixed(2);
};

export default async (task: MetricsWorkerTask): Promise<MetricsWorkerResult> => {
  if ('items' in task) {
    return countTokensBatch(task);
  }
  return countTokens(task);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
