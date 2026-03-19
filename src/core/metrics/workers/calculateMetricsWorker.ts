import { workerData } from 'node:worker_threads';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { EncodingData } from '../encodingCache.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';
import type { TokenEncoding } from '../tokenEncoding.js';

/**
 * Simple token counting worker for metrics calculation.
 *
 * This worker provides a focused interface for counting tokens from text content.
 * When pre-built encoding data is available via workerData, the expensive BPE
 * encoder construction (~60-90ms) is bypassed entirely.
 * All complex metric calculation logic is handled by the calling side to maintain
 * separation of concerns.
 */

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

// Retrieve pre-built encoding data from workerData (if provided by main thread)
const preBuiltEncodingData = (workerData as Record<string, unknown> | undefined)?.encodingData as
  | EncodingData
  | undefined;

export interface TokenCountTask {
  content: string;
  encoding: TokenEncoding;
  path?: string;
}

export const countTokens = async (task: TokenCountTask): Promise<number> => {
  const processStartAt = process.hrtime.bigint();

  try {
    const counter = getTokenCounter(task.encoding, preBuiltEncodingData);
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
