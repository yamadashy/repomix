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

export interface TokenCountItem {
  content: string;
  path?: string;
}

export interface TokenCountTask {
  items: TokenCountItem[];
  encoding: TokenEncoding;
}

export default async (task: TokenCountTask): Promise<number[]> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = await getTokenCounter(task.encoding);
    const results: number[] = [];
    for (const item of task.items) {
      results.push(counter.countTokens(item.content, item.path));
    }

    const processEndAt = process.hrtime.bigint();
    logger.trace(
      `Counted tokens for ${task.items.length} items. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
    );

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
