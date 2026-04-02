import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { MetricsWorkerResult, MetricsWorkerTask } from './calculateMetrics.js';
import type { TokenEncoding } from './TokenCounter.js';

// Target size per chunk in characters for parallel token counting.
// 100K characters balances tokenizer efficiency with parallelism across worker threads.
// Too small (e.g., ~4KB): excessive worker thread communication overhead.
// Too large (e.g., >500KB): underutilizes worker pool and increases per-chunk latency.
const TARGET_CHARS_PER_CHUNK = 100_000;

// Safety cap to prevent excessive task dispatch overhead for very large outputs.
const MAX_CHUNKS = 200;

// Parallelise output token counting when the content exceeds this threshold.
// BPE tokenisation is CPU-bound; distributing chunks across worker threads
// reduces wall-clock time roughly proportionally to available workers.
// Lowered from 1 MB to 50 KB so that typical outputs (~200-500 KB) also benefit.
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 50_000; // 50 KB

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
      // Split content into chunks for parallel processing across worker threads.
      // Compute chunk count dynamically, capped at MAX_CHUNKS to bound dispatch overhead.
      const numChunks = Math.min(Math.ceil(content.length / TARGET_CHARS_PER_CHUNK), MAX_CHUNKS);
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
          }) as Promise<number>;
        }),
      );

      // Sum up the results
      result = chunkResults.reduce((sum, count) => sum + count, 0);
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
