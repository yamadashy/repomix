import { logger } from '../../shared/logger.js';
import { type MetricsTaskRunner, runTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';

// Target ~500K characters per chunk to balance tokenization throughput and worker round-trip overhead.
// Larger chunks reduce per-batch IPC scheduling overhead (~1ms per round-trip). For a 4MB output
// this produces ~8 chunks — still enough for good parallelism across 4 worker threads while
// cutting round-trips by more than half compared to 200K chunks (~20 round-trips).
const TARGET_CHARS_PER_CHUNK = 500_000;
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: MetricsTaskRunner },
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
          return runTokenCount(deps.taskRunner, {
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
      result = await runTokenCount(deps.taskRunner, {
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
