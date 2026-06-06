import type { TaskRunner } from '../../shared/processConcurrency.js';
import type { TokenEncoding } from './TokenCounter.js';
import { contentCacheKey, getCached, setCached } from './tokenCountCache.js';
import type {
  MetricsWorkerResult,
  MetricsWorkerTask,
  TokenCountBatchTask,
  TokenCountTask,
} from './workers/calculateMetricsWorker.js';

export type MetricsTaskRunner = TaskRunner<MetricsWorkerTask, MetricsWorkerResult>;

export const runTokenCount = (taskRunner: MetricsTaskRunner, task: TokenCountTask): Promise<number> => {
  return taskRunner.run(task) as Promise<number>;
};

/**
 * Token-count a single string, served from the content-addressed disk cache
 * when possible. Mirrors the wrapper-tokenization fast path in
 * `calculateMetrics`: the count is a pure function of `(encoding, content)`,
 * so caching by content hash is behavior-preserving — a cache hit returns the
 * exact value the worker would compute, and any change to the content misses.
 *
 * Used for the git diff / git log token counts, whose content is stable across
 * repeated packs of an unchanged repo (same HEAD / working tree) but was
 * previously re-tokenized on the worker every run. A single git log can be tens
 * of milliseconds of tokenization on the metrics critical-path tail; serving it
 * from cache removes that from warm runs.
 */
export const runCachedTokenCount = async (
  taskRunner: MetricsTaskRunner,
  content: string,
  encoding: TokenEncoding,
): Promise<number> => {
  const cacheKey = contentCacheKey(encoding, content);
  const cached = getCached(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const tokens = await runTokenCount(taskRunner, { content, encoding });
  setCached(cacheKey, tokens);
  return tokens;
};

export const runBatchTokenCount = (taskRunner: MetricsTaskRunner, task: TokenCountBatchTask): Promise<number[]> => {
  return taskRunner.run(task) as Promise<number[]>;
};
