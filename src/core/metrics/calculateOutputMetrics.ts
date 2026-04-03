import { logger } from '../../shared/logger.js';
import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import type { TokenCountTask } from './workers/calculateMetricsWorker.js';

// Target ~100KB per chunk so that each worker task does meaningful tokenization work.
// Previously this was 1000 (number of chunks), which created ~1KB chunks for 1MB output,
// causing ~1000 worker round-trips with ~0.5ms overhead each (~500ms total waste).
const TARGET_CHARS_PER_CHUNK = 100_000;
const MIN_CONTENT_LENGTH_FOR_PARALLEL = 1_000_000; // 1MB

export const calculateOutputMetrics = async (
  content: string,
  encoding: TokenEncoding,
  path: string | undefined,
  deps: { taskRunner: TaskRunner<TokenCountTask, number[]> },
): Promise<number> => {
  const shouldRunInParallel = content.length > MIN_CONTENT_LENGTH_FOR_PARALLEL;

  try {
    logger.trace(`Starting output token count for ${path || 'output'}`);
    const startTime = process.hrtime.bigint();

    let result: number;

    if (shouldRunInParallel) {
      // Split content into chunks and send each as a separate task for parallel processing.
      // Each chunk is ~100KB of tokenization work, so IPC overhead is negligible.
      // Sending all chunks to one worker would lose parallelism.
      const chunks: { content: string; path?: string }[] = [];

      for (let i = 0; i < content.length; i += TARGET_CHARS_PER_CHUNK) {
        const chunkIndex = chunks.length;
        chunks.push({
          content: content.slice(i, i + TARGET_CHARS_PER_CHUNK),
          path: path ? `${path}-chunk-${chunkIndex}` : undefined,
        });
      }

      // Process chunks in parallel across workers (one item per task)
      const chunkResults = await Promise.all(
        chunks.map(async (chunk) => {
          const [tokenCount] = await deps.taskRunner.run({ items: [chunk], encoding });
          return tokenCount;
        }),
      );
      result = chunkResults.reduce((sum, count) => sum + count, 0);
    } else {
      // Process small content as a single-item batch
      const [tokenCount] = await deps.taskRunner.run({
        items: [{ content, path }],
        encoding,
      });
      result = tokenCount;
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
