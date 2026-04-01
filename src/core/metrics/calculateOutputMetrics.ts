import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

// Number of chunks for parallel output token counting.
// Each worker task has ~1ms of message-passing overhead, so fewer larger chunks
// reduces overhead while maintaining parallelism across available CPU cores.
const CHUNK_COUNT = 50;
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1000KB

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
      // Split content into chunks for parallel processing
      const chunkSize = Math.ceil(content.length / CHUNK_COUNT);
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
