import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import {
  getProcessConcurrency as defaultGetProcessConcurrency,
  getWorkerThreadCount,
  initTaskRunner,
  type TaskRunner,
} from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import {
  getCachedSecurityResult,
  hasLoadedSecurityCheckEntries,
  securityCacheKey,
  setCachedSecurityResult,
} from './securityCheckCache.js';
import type { SecurityCheckItem, SecurityCheckTask, SecurityCheckType } from './workers/securityCheckWorker.js';

export type { SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

export type SecurityTaskRunner = TaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>;

export interface SecurityTaskRunnerWithWarmup {
  taskRunner: SecurityTaskRunner;
  warmupPromise: Promise<unknown>;
}

// Cap security workers at 2 to reduce contention with the metrics worker pool that
// runs concurrently. The security check uses coarse-grained batches (BATCH_SIZE=50),
// so 2 workers provide sufficient parallelism even for large repos (1000 files = 20 batches).
const MAX_SECURITY_WORKER_THREADS = 2;

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// Security check always processes all files (~1000 in a typical repo), so a batch size of 50
// already produces ~20 batches — enough to distribute well across available CPU cores.
// (Unlike metrics, which may process only a small number of top files when tokenCountTree
// is disabled, and needs a smaller batch size to avoid one batch monopolizing a worker.)
const BATCH_SIZE = 50;

/**
 * Create a security worker pool and warm up its worker threads by dispatching a
 * no-op task to each. The first task on a freshly spawned worker pays a ~50ms
 * cost loading `@secretlint/core` + `@secretlint/secretlint-rule-preset-recommend`;
 * with 2 workers the cumulative cold-start is ~100ms wall-clock when both load
 * concurrently. Pre-warming at the pack-pipeline scope lets that cost overlap
 * with collectFiles + git ops (~200ms) instead of running on the critical path
 * inside `runSecurityCheck`.
 *
 * `numOfTasks` sizes the pool to match the pool `runSecurityCheck` would
 * otherwise create internally. Callers typically pass the file count;
 * `runSecurityCheck` itself uses `fileItems + gitDiffItems + gitLogItems`,
 * but at `TASKS_PER_THREAD = 200` the up-to-3 git items never change
 * `getWorkerThreadCount`'s output for any plausible repo size.
 */
export const createSecurityTaskRunner = (
  numOfTasks: number,
  deps: {
    initTaskRunner?: typeof initTaskRunner;
    getProcessConcurrency?: typeof defaultGetProcessConcurrency;
  } = {},
): SecurityTaskRunnerWithWarmup => {
  const initTaskRunnerFn = deps.initTaskRunner ?? initTaskRunner;
  const getProcessConcurrencyFn = deps.getProcessConcurrency ?? defaultGetProcessConcurrency;
  const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKER_THREADS, getProcessConcurrencyFn());

  const taskRunner = initTaskRunnerFn<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: maxSecurityWorkers,
  });

  const { maxThreads } = getWorkerThreadCount(numOfTasks, maxSecurityWorkers);
  // Dispatch one no-op task per worker thread. Tinypool spawns a fresh worker for
  // each concurrent task (up to maxThreads), so this fans out the @secretlint/core
  // module load across all workers in parallel rather than serially.
  const warmupPromise = Promise.all(
    Array.from({ length: maxThreads }, () => taskRunner.run({ items: [] }).catch(() => [])),
  );

  return { taskRunner, warmupPromise };
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps: {
    initTaskRunner?: typeof initTaskRunner;
    getProcessConcurrency?: typeof defaultGetProcessConcurrency;
    // Optional pre-warmed task runner. When provided, the caller owns its lifecycle
    // (creation and cleanup); when omitted, we create and clean up a fresh pool.
    taskRunner?: SecurityTaskRunner;
  } = {},
): Promise<SuspiciousFileResult[]> => {
  const initTaskRunnerFn = deps.initTaskRunner ?? initTaskRunner;
  const getProcessConcurrencyFn = deps.getProcessConcurrency ?? defaultGetProcessConcurrency;
  const gitDiffItems: SecurityCheckItem[] = [];
  const gitLogItems: SecurityCheckItem[] = [];

  // Add Git diff content for security checking if available
  if (gitDiffResult) {
    if (gitDiffResult.workTreeDiffContent) {
      gitDiffItems.push({
        filePath: 'Working tree changes',
        content: gitDiffResult.workTreeDiffContent,
        type: 'gitDiff',
      });
    }

    if (gitDiffResult.stagedDiffContent) {
      gitDiffItems.push({
        filePath: 'Staged changes',
        content: gitDiffResult.stagedDiffContent,
        type: 'gitDiff',
      });
    }
  }

  // Add Git log content for security checking if available
  if (gitLogResult) {
    if (gitLogResult.logContent) {
      gitLogItems.push({
        filePath: 'Git log history',
        content: gitLogResult.logContent,
        type: 'gitLog',
      });
    }
  }

  const fileItems: SecurityCheckItem[] = rawFiles.map((file) => ({
    filePath: file.path,
    content: file.content,
    type: 'file',
  }));

  // Cache lookup pattern mirrors `calculateFileMetrics`. Skipped on cold
  // pipelines (`!hasLoadedSecurityCheckEntries`) so we don't pay ~28 ms of
  // SHA-256 just to record a guaranteed miss; keys are computed lazily in the
  // result-write-back loop below to seed the cache for next run.
  //
  // Git diff / log items are intentionally NOT cached — their content is
  // unique per session, so cache hit rate would be ~0 % and the SHA-256 would
  // be pure overhead. They flow straight to the worker pool.
  const cachedFileResults: SuspiciousFileResult[] = [];
  const uncachedFileItems: SecurityCheckItem[] = [];
  const uncachedFileKeys: (string | null)[] = [];

  const cacheHasEntries = hasLoadedSecurityCheckEntries();

  if (cacheHasEntries) {
    for (const item of fileItems) {
      const key = securityCacheKey(item.content);
      // `securityCacheKey` returns null when the secretlint rule fingerprint
      // is unavailable (rare resolver edge case). In that branch we treat
      // the file as uncached AND record null so the writeback also skips it.
      if (key === null) {
        uncachedFileItems.push(item);
        uncachedFileKeys.push(null);
        continue;
      }
      const cached = getCachedSecurityResult(key);
      if (cached !== undefined) {
        // Cached `null` = previously checked clean (drop), `{ messages }`
        // = previously flagged (rebuild a SuspiciousFileResult inline so
        // the cache module exposes only the value, not the result shape).
        if (cached !== null) {
          cachedFileResults.push({ filePath: item.filePath, messages: cached.messages, type: item.type });
        }
      } else {
        uncachedFileItems.push(item);
        uncachedFileKeys.push(key);
      }
    }
  } else {
    // Cold cache: every file is a miss. Defer the SHA-256 cost — keys are computed
    // lazily after the worker scan in the result-write-back loop below.
    for (const item of fileItems) {
      uncachedFileItems.push(item);
      uncachedFileKeys.push(null);
    }
  }

  const allItems = [...uncachedFileItems, ...gitDiffItems, ...gitLogItems];
  const totalItems = fileItems.length + gitDiffItems.length + gitLogItems.length;
  const cacheHits = fileItems.length - uncachedFileItems.length;
  logger.trace(`Security cache: ${cacheHits} hits, ${uncachedFileItems.length} misses (file items)`);

  if (totalItems === 0) {
    return [];
  }

  // Fast path: every file was cached AND there are no git diff/log items.
  // No workers needed at all; skip pool init/teardown entirely.
  if (allItems.length === 0) {
    progressCallback(`Running security check... (${fileItems.length}/${fileItems.length})`);
    return cachedFileResults;
  }

  const ownsTaskRunner = !deps.taskRunner;

  // numOfTasks uses allItems.length (only the items actually dispatched),
  // matching the worker pool to the residual workload after cache hits.
  const taskRunner =
    deps.taskRunner ??
    initTaskRunnerFn<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: allItems.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: Math.min(MAX_SECURITY_WORKER_THREADS, getProcessConcurrencyFn()),
    });

  // Split residual (uncached + git) items into batches to reduce IPC round-trips
  const batches: SecurityCheckItem[][] = [];
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    batches.push(allItems.slice(i, i + BATCH_SIZE));
  }

  try {
    logger.trace(`Starting security check for ${allItems.length} files/content in ${batches.length} batches`);
    const startTime = process.hrtime.bigint();

    let completedItems = cacheHits;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const results = await taskRunner.run({ items: batch });

        completedItems += batch.length;
        const lastItem = batch[batch.length - 1];
        progressCallback(`Running security check... (${completedItems}/${totalItems}) ${pc.dim(lastItem.filePath)}`);
        logger.trace(`Running security check... (${completedItems}/${totalItems}) ${lastItem.filePath}`);

        return results;
      }),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    const flatBatchResults = batchResults.flat();

    // Write per-file results back to the cache for next time. The first
    // `uncachedFileItems.length` entries of `flatBatchResults` are the file
    // scan results in `allItems` order (we constructed allItems as
    // [...uncachedFileItems, ...gitDiffItems, ...gitLogItems]). Git diff
    // and log results are intentionally not cached.
    //
    // On the cold pipeline (`uncachedFileKeys[i] === null`) we hash content
    // here for the first time. The ~28 ms total SHA-256 cost is paid once on
    // the run that creates the cache and amortises across every subsequent
    // run (which pays only the in-memory `Map.get` lookup and skips the
    // ~130 ms worker-side secretlint scan entirely). Cold-pipeline overhead
    // mirrors the existing token-count cache pattern documented elsewhere
    // in this file's tree.
    //
    // `flatBatchResults[0..uncachedFileItems.length-1]` correspond to
    // `uncachedFileItems` because we built `allItems` as
    // `[...uncachedFileItems, ...gitDiffItems, ...gitLogItems]` and
    // `Promise.all` preserves submission order.
    for (let i = 0; i < uncachedFileItems.length; i++) {
      const result = flatBatchResults[i];
      const key = uncachedFileKeys[i] ?? securityCacheKey(uncachedFileItems[i].content);
      // null key = rule fingerprint unavailable; skip writeback so we don't
      // poison the cache under a different fingerprint on the next run.
      if (key === null) continue;
      if (result === null) {
        setCachedSecurityResult(key, null);
      } else {
        setCachedSecurityResult(key, { messages: result.messages });
      }
    }

    const workerSuspicious = flatBatchResults.filter((r): r is SuspiciousFileResult => r !== null);
    return [...cachedFileResults, ...workerSuspicious];
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    if (ownsTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
