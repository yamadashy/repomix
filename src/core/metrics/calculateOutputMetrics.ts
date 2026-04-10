import { logger } from '../../shared/logger.js';
import { type MetricsTaskRunner, runTokenCount } from './metricsWorkerRunner.js';
import type { TokenEncoding } from './TokenCounter.js';

// Target ~200K characters per chunk to balance tokenization throughput and worker round-trip overhead.
// Benchmarks show 200K is the sweet spot: fewer round-trips than 100K with enough chunks
// for good parallelism across available threads (e.g., 20 chunks for a 4M character output).
export const TARGET_CHARS_PER_CHUNK = 200_000;

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: MetricsTaskRunner },
): Promise<number> => {
  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    // Always split into chunks for parallel processing across the worker pool.
    // For content <= TARGET_CHARS_PER_CHUNK, this produces exactly one chunk — identical
    // behavior to a direct single-worker call. For larger content, chunks are distributed
    // across all available workers, utilizing the pre-warmed pool that would otherwise
    // sit idle for outputs between 200K and 1MB characters.
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += TARGET_CHARS_PER_CHUNK) {
      chunks.push(content.slice(i, i + TARGET_CHARS_PER_CHUNK));
    }

    const chunkResults = await Promise.all(
      chunks.map(async (chunk, index) => {
        return runTokenCount(deps.taskRunner, {
          content: chunk,
          encoding,
          path: path ? `${path}-chunk-${index}` : undefined,
        });
      }),
    );

    const result = chunkResults.reduce((sum, count) => sum + count, 0);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Output token count completed in ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    logger.error('Error during token count:', error);
    throw error;
  }
};
