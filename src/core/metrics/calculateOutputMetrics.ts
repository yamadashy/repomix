import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, type TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountBatchTask, TokenCountTask } from './workers/calculateMetricsWorker.js';

const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1000KB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask | TokenCountBatchTask, number | number[]> },
): Promise<number> => {
  const shouldRunInParallel = content.length > MIN_CONTENT_LENGTH_FOR_PARALLEL;

  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    let result: number;

    if (shouldRunInParallel) {
      // Split content into chunks for parallel processing.
      // Use one chunk per available CPU core to maximize parallelism while minimizing
      // task dispatch overhead (structured clone serialization, tinypool scheduling,
      // and Promise resolution per chunk).
      const chunkCount = Math.max(1, getProcessConcurrency());
      const chunkSize = Math.ceil(content.length / chunkCount);
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
