import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

// Parallelise output token counting when the content exceeds this threshold.
// BPE tokenisation is CPU-bound; splitting into chunks and distributing across
// worker threads reduces wall-clock time roughly proportionally to the number
// of available workers.
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 50_000; // 50 KB

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
      // Use a small number of large chunks to minimise per-task overhead while
      // still benefiting from parallel execution across available workers.
      const numChunks = Math.max(2, getProcessConcurrency());
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
