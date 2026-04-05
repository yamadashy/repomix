import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { MetricsWorkerResult, MetricsWorkerTask } from './workers/calculateMetricsWorker.js';

// Target ~200KB per chunk to balance tokenization throughput and worker round-trip overhead.
// Benchmarks show 200K is the sweet spot: fewer round-trips than 100K with enough chunks
// for good parallelism across available threads (e.g., 20 chunks for 4MB output on 4 cores).
const TARGET_CHARS_PER_CHUNK = 200_000;
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<MetricsWorkerTask, MetricsWorkerResult> },
): Promise<number> => {
  const shouldRunInParallel = content.length > MIN_CONTENT_LENGTH_FOR_PARALLEL;

  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    let result: number;

    if (shouldRunInParallel) {
      // Split content into chunks for parallel processing
      const chunks: string[] = [];

      for (let i = 0; i < content.length; i += TARGET_CHARS_PER_CHUNK) {
        chunks.push(content.slice(i, i + TARGET_CHARS_PER_CHUNK));
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
      result = 0;
      for (const count of chunkResults) {
        result += count as number;
      }
    } else {
      // Process small content directly
      result = (await deps.taskRunner.run({
        content,
        encoding,
        path,
      })) as number;
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
