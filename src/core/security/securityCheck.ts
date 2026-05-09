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
import { getCacheSize, isCleanCached, markClean, securityCacheKey } from './securityCheckCache.js';
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

  // Combine all items, then split into batches
  const allItems = [...fileItems, ...gitDiffItems, ...gitLogItems];
  const totalItems = allItems.length;

  if (totalItems === 0) {
    return [];
  }

  // Resolve cache hits before dispatching to workers. Each MD5 (~50 µs per
  // 5 KB file) is far cheaper than a worker IPC + secretlint scan
  // (~5–15 ms per 50-item batch), so this filter pays for itself the first
  // time a cache entry hits and removes the entire security worker pool from
  // the wall-clock critical path on warm runs.
  //
  // Skip the entire pre-hash pass on a cold cache (size === 0): every item
  // is guaranteed to be a miss, so MD5'ing them up front would just add
  // ~30 ms of blocking work to the security-check critical path with no
  // hits to recoup it. On a cold run we still populate the cache from each
  // batch's `.then()` (interleaved with worker dispatch — see below), so
  // subsequent runs become warm without a one-time double-hashing penalty.
  //
  // Only files (not git diffs/logs) are cache-eligible: git diffs change
  // every workspace edit and git logs change with every commit, so the cache
  // hit rate would be ~0 for those item types and the MD5 would be pure
  // overhead.
  const cacheIsCold = getCacheSize() === 0;
  const uncachedItems: SecurityCheckItem[] = [];
  // Track each uncached file item's cache key so we can mark it clean after
  // the worker reports a null (no-issues) result. Aligned by index with
  // `uncachedItems`. `null` for non-file items (git diffs/logs) and for file
  // items whose key was deferred to the post-worker step on a cold cache.
  const uncachedFileKeys: (string | null)[] = [];
  let cacheHits = 0;

  for (const item of allItems) {
    if (!cacheIsCold && item.type === 'file') {
      const key = securityCacheKey(item.content);
      if (isCleanCached(key)) {
        cacheHits++;
        continue;
      }
      uncachedItems.push(item);
      uncachedFileKeys.push(key);
    } else {
      uncachedItems.push(item);
      uncachedFileKeys.push(null);
    }
  }

  logger.trace(`Security check cache: ${cacheHits} hits, ${uncachedItems.length} misses`);

  if (uncachedItems.length === 0) {
    progressCallback(`Running security check... (${totalItems}/${totalItems})`);
    logger.trace('Security check completed: all items served from cache');
    return [];
  }

  const ownsTaskRunner = !deps.taskRunner;

  // numOfTasks sizes the pool from the (possibly reduced) uncached count so we
  // do not over-spawn workers for a near-fully-cached run.
  const taskRunner =
    deps.taskRunner ??
    initTaskRunnerFn<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: uncachedItems.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: Math.min(MAX_SECURITY_WORKER_THREADS, getProcessConcurrencyFn()),
    });

  // Split items into batches to reduce IPC round-trips
  const batches: SecurityCheckItem[][] = [];
  // Track each batch's starting offset into `uncachedItems` so we can map
  // worker-returned results back to their original cache keys.
  const batchOffsets: number[] = [];
  for (let i = 0; i < uncachedItems.length; i += BATCH_SIZE) {
    batchOffsets.push(i);
    batches.push(uncachedItems.slice(i, i + BATCH_SIZE));
  }

  try {
    logger.trace(
      `Starting security check for ${uncachedItems.length}/${totalItems} uncached items in ${batches.length} batches`,
    );
    const startTime = process.hrtime.bigint();

    let completedItems = cacheHits;

    const batchResults = await Promise.all(
      batches.map(async (batch, batchIdx) => {
        const results = await taskRunner.run({ items: batch });

        // Cache clean (null-result) file items. Items that returned a
        // suspicious finding are NOT cached: re-runs should re-report them,
        // and the cache file must never hold message text that could quote
        // secret material from user code.
        //
        // Hashing happens here (after the worker resolves) rather than in a
        // single up-front pass so that on a cold cache the ~30 ms of MD5
        // work is interleaved with the worker dispatch wall-time instead of
        // serialised in front of it. On the warm path the key was already
        // computed by the cache pre-check and is reused; on the cold path
        // (key === null for file items) we compute it lazily here.
        const offset = batchOffsets[batchIdx];
        for (let i = 0; i < results.length; i++) {
          if (results[i] !== null) continue;
          const item = batch[i];
          if (item.type !== 'file') continue;
          const key = uncachedFileKeys[offset + i] ?? securityCacheKey(item.content);
          markClean(key);
        }

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

    return batchResults.flat().filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    if (ownsTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
