import { setLogLevelByWorkerData } from '../../../shared/logger.js';
import type { TokenEncoding } from '../TokenCounter.js';
import { freeTokenCounters, getTokenCounter } from '../tokenCounterFactory.js';
import type { FileMetrics } from './types.js';

/**
 * Token counting worker for metrics calculation.
 *
 * Supports two task types:
 * - Single: count tokens for a single content string (legacy)
 * - Batch: count tokens for multiple files in one IPC round-trip
 *
 * Using a worker thread keeps gpt-tokenizer's ~288ms BPE table initialization
 * off the main thread, and the actual token counting runs without blocking
 * the event loop during the parallel security check + metrics phase.
 */

// Initialize logger configuration from workerData at module load time
setLogLevelByWorkerData();

export interface TokenCountTask {
  content: string;
  encoding: TokenEncoding;
  path?: string;
}

export interface BatchTokenCountTask {
  batch: true;
  files: { path: string; content: string }[];
  encoding: TokenEncoding;
}

export const countTokens = async (task: TokenCountTask): Promise<number> => {
  const counter = await getTokenCounter(task.encoding);
  return counter.countTokens(task.content, task.path);
};

export const batchCountTokens = async (task: BatchTokenCountTask): Promise<FileMetrics[]> => {
  const counter = await getTokenCounter(task.encoding);
  const results: FileMetrics[] = [];
  for (const file of task.files) {
    const tokenCount = counter.countTokens(file.content, file.path);
    results.push({
      path: file.path,
      charCount: file.content.length,
      tokenCount,
    });
  }
  return results;
};

export default async (task: TokenCountTask | BatchTokenCountTask): Promise<number | FileMetrics[]> => {
  if ('batch' in task) {
    return batchCountTokens(task);
  }
  return countTokens(task);
};

// Export cleanup function for Tinypool teardown
export const onWorkerTermination = async (): Promise<void> => {
  await freeTokenCounters();
};
