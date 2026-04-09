import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter, initTokenCounterFromBpeRanks } from '../tokenCounterFactory.js';

/**
 * Token counting worker for metrics calculation.
 *
 * Supports both single-content and batch modes. Batch mode reduces IPC overhead
 * by processing multiple files per worker round-trip (~0.5ms overhead per round-trip).
 * For 991 files, batching with size 10 reduces round-trips from 991 to ~100.
 */

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface TokenCountTask {
  content: string;
  encoding: TokenEncoding;
  path?: string;
  /** Pre-serialized BPE rank data (JSON string) for fast worker initialization.
   * When provided (typically in warmup tasks), the worker skips the expensive
   * per-worker BPE file I/O (~105ms) and initializes from the pre-loaded data. */
  bpeRanksJson?: string;
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
    // Initialize from pre-loaded BPE data if provided (warmup path).
    // This avoids each worker independently loading the ~3.6MB BPE file from disk,
    // saving ~105ms per worker by receiving the data via IPC instead.
    // If parsing fails, getTokenCounter below falls back to disk loading.
    if (task.bpeRanksJson) {
      try {
        const bpeRanks = JSON.parse(task.bpeRanksJson);
        initTokenCounterFromBpeRanks(task.encoding, bpeRanks);
      } catch {
        // Fall through to getTokenCounter which loads from disk
      }
    }

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
