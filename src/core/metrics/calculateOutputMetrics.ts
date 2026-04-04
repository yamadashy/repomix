import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchTask } from './workers/calculateMetricsWorker.js';

// Target ~100KB per chunk so that each worker task does meaningful tokenization work.
// Previously this was 1000 (number of chunks), which created ~1KB chunks for 1MB output,
// causing ~1000 worker round-trips with ~0.5ms overhead each (~500ms total waste).
const TARGET_CHARS_PER_CHUNK = 100_000;
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountBatchTask, number[]> },
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
          const results = await deps.taskRunner.run({
            items: [
              {
                content: chunk,
                encoding,
                path: path ? `${path}-chunk-${index}` : undefined,
              },
            ],
          });
          return results[0];
        }),
      );

      // Sum up the results
      result = chunkResults.reduce((sum, count) => sum + count, 0);
    } else {
      // Process small content directly
      const results = await deps.taskRunner.run({
        items: [{ content, encoding, path }],
      });
      result = results[0];
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
