import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';

/**
 * Batched token counting worker for metrics calculation.
 *
 * This worker counts tokens for batches of content items in a single IPC round-trip,
 * reducing per-message overhead when processing many files. All complex metric
 * calculation logic is handled by the calling side to maintain separation of concerns.
 */

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface TokenCountItem {
  content: string;
  encoding: TokenEncoding;
  path?: string;
}

export interface TokenCountBatchTask {
  items: TokenCountItem[];
}

const getProcessDuration = (startTime: bigint): string => {
  const endTime = process.hrtime.bigint();
  return (Number(endTime - startTime) / 1e6).toFixed(2);
};

export default async (task: TokenCountBatchTask): Promise<number[]> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const results: number[] = [];
    for (const item of task.items) {
      const counter = await getTokenCounter(item.encoding);
      results.push(counter.countTokens(item.content, item.path));
    }

    logger.trace(`Counted tokens for ${task.items.length} items. Took: ${getProcessDuration(processStartAt)}ms`);
    return results;
  } catch (error) {
    logger.error('Error in token counting worker:', error);
    throw error;
  }
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  freeTokenCounters();
};
