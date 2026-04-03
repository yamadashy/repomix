import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<number> => {
  const shouldRunInParallel = content.length > MIN_CONTENT_LENGTH_FOR_PARALLEL;

  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    let result: number;

    if (shouldRunInParallel) {
      // Split content into CPU-core-count chunks for parallel processing.
      // The previous approach created a fixed 1000 chunks (~3-5KB each for typical outputs),
      // which caused excessive IPC overhead: each chunk requires a worker thread round-trip
      // (message serialization, scheduling, deserialization). With 1000 tasks queued to a pool
      // of 4-16 threads, the scheduling overhead alone can reach hundreds of milliseconds.
      // Using core-count chunks (4-16 instead of 1000) reduces task scheduling overhead by
      // ~100-250x while maintaining full CPU utilization across available cores.
      const numChunks = Math.max(1, getProcessConcurrency());
      const chunkSize = Math.ceil(content.length / numChunks);
      const chunks: string[] = [];

      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
      }

      // Process chunks in parallel
      const chunkResults = await Promise.all(
        chunks.map(async (chunk, index) => {
          return deps.taskRunner.run({
            content: chunk,
            encoding,
            path: path ? `${path}-chunk-${index}` : undefined,
          });
        }),
      );

      // Sum up the results
      result = chunkResults.reduce((sum, count) => sum + count, 0);
    } else {
      // Process small content directly
      result = await deps.taskRunner.run({
        content,
        encoding,
        path,
      });
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Output token count completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during token count:', error);
    throw error;
  }
};
