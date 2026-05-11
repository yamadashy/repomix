import type { TaskRunner } from '../../shared/processConcurrency.js';
import { contentCacheKey, getCached, setCached } from './tokenCountCache.js';
import type { TokenEncoding } from './tokenEncodings.js';
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

export const runBatchTokenCount = (taskRunner: MetricsTaskRunner, task: TokenCountBatchTask): Promise<number[]> => {
  return taskRunner.run(task) as Promise<number[]>;
};

/**
 * Resolve a single piece of content's token count via the in-memory token-count
 * cache, falling back to a worker round-trip on a miss and populating the cache
 * for next time. The content-addressed key (MD5 of content + encoding) means a
 * change to the underlying content auto-invalidates the cached value.
 *
 * Shared by calculateGitLogMetrics and calculateGitDiffMetrics, which both
 * dispatch one token count per byte-stable git artifact (log / worktree diff /
 * staged diff). Per-file token caching lives in `calculateFileMetrics` and
 * uses the same `tokenCountCache` module-level Map, so a single repomix
 * invocation shares cache state across all four metrics paths.
 */
export const countTokensWithCache = async (
  content: string,
  encoding: TokenEncoding,
  taskRunner: MetricsTaskRunner,
): Promise<number> => {
  const cacheKey = contentCacheKey(encoding, content);
  const cached = getCached(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const result = await runTokenCount(taskRunner, { content, encoding });
  setCached(cacheKey, result);
  return result;
};
