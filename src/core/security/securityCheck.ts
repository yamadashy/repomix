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
import { contentCacheKey, getCached, getCacheSize, setCached } from './securityCheckCache.js';
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

  // Classify file items into cache hits and misses before deciding whether to
  // dispatch any worker tasks. Secretlint is deterministic for the same content
  // and rule preset, so a cached result is permanently valid until the cache
  // version is bumped (which happens on rule-preset upgrades).
  //
  // Git diff / git log content is never cached: by nature it changes between
  // runs, so cache hits would be vanishingly rare and the cache file would grow
  // unboundedly with disposable entries. These items always go through workers.
  //
  // Cold-cache fast path: when the in-memory cache is empty (no on-disk file or
  // wrong version), pre-hashing every file is pure main-thread overhead because
  // every lookup would miss anyway. We instead enqueue every file as a "miss"
  // with a null placeholder key, and defer the MD5 hash to the per-batch write
  // callback after workers return. Each batch's hashing then overlaps with
  // subsequent batches' worker scanning instead of blocking dispatch.
  const cachedFileResults: SuspiciousFileResult[] = [];
  const missedFileItems: SecurityCheckItem[] = [];
  const missedFileKeys: (string | null)[] = [];

  const hasCacheEntries = getCacheSize() > 0;

  if (hasCacheEntries) {
    for (const file of rawFiles) {
      const key = contentCacheKey(file.content);
      const cached = getCached(key);
      if (cached === undefined) {
        missedFileItems.push({ filePath: file.path, content: file.content, type: 'file' });
        missedFileKeys.push(key);
      } else if (cached !== null) {
        cachedFileResults.push({ filePath: file.path, messages: cached, type: 'file' });
      }
      // cached === null means "scanned previously, clean" — nothing to push.
    }
  } else {
    for (const file of rawFiles) {
      missedFileItems.push({ filePath: file.path, content: file.content, type: 'file' });
      missedFileKeys.push(null);
    }
  }

  const dispatchItems = [...missedFileItems, ...gitDiffItems, ...gitLogItems];
  const totalDispatch = dispatchItems.length;

  if (totalDispatch === 0) {
    logger.trace(`Security check served entirely from cache for ${rawFiles.length} files`);
    return cachedFileResults;
  }

  const ownsTaskRunner = !deps.taskRunner;

  // numOfTasks uses totalDispatch (only the items we actually scan), so cold
  // runs with N files still see numOfTasks≈N and warm runs with a handful of
  // git items shrink the pool sizing accordingly.
  const taskRunner =
    deps.taskRunner ??
    initTaskRunnerFn<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: totalDispatch,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: Math.min(MAX_SECURITY_WORKER_THREADS, getProcessConcurrencyFn()),
    });

  // Split items into batches to reduce IPC round-trips
  const batches: SecurityCheckItem[][] = [];
  const batchOffsets: number[] = [];
  for (let i = 0; i < dispatchItems.length; i += BATCH_SIZE) {
    batches.push(dispatchItems.slice(i, i + BATCH_SIZE));
    batchOffsets.push(i);
  }

  try {
    logger.trace(
      `Starting security check for ${totalDispatch} files/content in ${batches.length} batches (${rawFiles.length - missedFileItems.length} cached)`,
    );
    const startTime = process.hrtime.bigint();

    let completedItems = 0;

    const batchResults = await Promise.all(
      batches.map(async (batch, batchIdx) => {
        const results = await taskRunner.run({ items: batch });

        completedItems += batch.length;
        const lastItem = batch[batch.length - 1];
        progressCallback(`Running security check... (${completedItems}/${totalDispatch}) ${pc.dim(lastItem.filePath)}`);
        logger.trace(`Running security check... (${completedItems}/${totalDispatch}) ${lastItem.filePath}`);

        // Write file-type results back into the content cache. Git diff/log
        // items have no corresponding key (we never pushed one), so they are
        // skipped by the offset check below. On the cold-cache fast path the
        // key is null and we hash here, overlapping with subsequent batches.
        const baseOffset = batchOffsets[batchIdx];
        for (let i = 0; i < batch.length; i++) {
          const absoluteIdx = baseOffset + i;
          if (absoluteIdx < missedFileItems.length) {
            // `?? null` is a defensive guard: workers always return one entry
            // per item today, but treating a short array as "clean for the
            // missing tail" prevents `setCached(key, undefined)` poisoning the
            // cache with an entry that read back as a non-null hit later.
            const result = results[i] ?? null;
            const key = missedFileKeys[absoluteIdx] ?? contentCacheKey(missedFileItems[absoluteIdx].content);
            setCached(key, result === null ? null : result.messages);
          }
        }

        return results;
      }),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    const workerResults = batchResults.flat().filter((result): result is SuspiciousFileResult => result !== null);
    return [...cachedFileResults, ...workerResults];
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    if (ownsTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
