import type { TiktokenEncoding } from 'tiktoken';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TiktokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number> },
): Promise<number> => {
  const shouldRunInParallel = content.length > MIN_CONTENT_LENGTH_FOR_PARALLEL;

  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    let result: number;

    if (shouldRunInParallel) {
      // Split content into chunks matching available CPU cores to minimize IPC overhead.
      // Previously used 1000 fixed chunks, which created excessive IPC round-trips
      // (~0.3ms overhead per task × 1000 = ~300ms of pure serialization overhead).
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
