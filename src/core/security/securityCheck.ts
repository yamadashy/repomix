import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import {
  getProcessConcurrency as defaultGetProcessConcurrency,
  initTaskRunner,
  type TaskRunner,
} from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { mightContainSecret } from './securityCheckPrefilter.js';
import {
  getCached as getCachedSecurityResult,
  securityResultCacheKey,
  setCachedClean as setCachedSecurityClean,
} from './securityResultCache.js';
import type { SecurityCheckItem, SecurityCheckTask, SecurityCheckType } from './workers/securityCheckWorker.js';

export type { SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

export type SecurityCheckTaskRunner = TaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>;

export interface SecurityCheckTaskRunnerWithWarmup {
  taskRunner: SecurityCheckTaskRunner;
  warmupPromise: Promise<unknown>;
}

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// Security check always processes all files (~1000 in a typical repo), so a batch size of 50
// already produces ~20 batches — enough to distribute well across available CPU cores.
// (Unlike metrics, which may process only a small number of top files when tokenCountTree
// is disabled, and needs a smaller batch size to avoid one batch monopolizing a worker.)
const BATCH_SIZE = 50;

// Cap security workers at 2 to reduce contention with the metrics worker pool that
// runs concurrently. The security check uses coarse-grained batches (BATCH_SIZE=50),
// so 2 workers provide sufficient parallelism even for large repos (1000 files = 20 batches).
const MAX_SECURITY_WORKERS = 2;

/**
 * Create the security-check worker pool and warm it up by dispatching empty
 * batches — one per worker the pool may use — so each thread spawns and pays
 * its secretlint module-load cost (~75ms) up front.
 *
 * `runSecurityCheck` normally creates this pool lazily, just before it
 * dispatches the first real batch. Because that dispatch sits on the serial
 * critical path (it runs concurrently with file processing, but the metrics
 * worker pool is the only other concurrent CPU user), the secretlint load
 * lands directly in front of the first batch's result. Creating the pool at
 * the start of `pack()` instead lets that load overlap file search and
 * collection, so the workers are already warm when the batches arrive.
 *
 * The warm-up is best-effort: each empty-batch dispatch resolves to `[]` and
 * swallows errors. Pool sizing (`maxWorkerThreads`) is identical to the lazy
 * path, so worker counts and results are unchanged.
 */
export const createSecurityCheckTaskRunner = (
  // `numOfTasks` only gates how many worker threads the pool may use (the 1-vs-2
  // worker cap). The pre-warm path runs before the file count is known, so it
  // defaults to a value that allows the full MAX_SECURITY_WORKERS cap — workers
  // are bounded the same way the lazy path bounds them, and results are identical.
  numOfTasks: number = MAX_SECURITY_WORKERS * 100,
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
): SecurityCheckTaskRunnerWithWarmup => {
  const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());

  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: maxSecurityWorkers,
  });

  // Dispatch one empty batch per worker the pool may use so every thread spawns
  // and loads secretlint while file search / collection are still in flight.
  const warmupPromise = Promise.all(
    Array.from({ length: maxSecurityWorkers }, () => taskRunner.run({ items: [] }).catch(() => [])),
  );

  return { taskRunner, warmupPromise };
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
  // Optional pre-warmed task runner created by `createSecurityCheckTaskRunner`.
  // When supplied, its worker pool is reused (workers are already warm) and its
  // lifecycle — including cleanup — is owned by the caller, so this function
  // skips the internal cleanup. When omitted, a pool is created and torn down
  // here exactly as before.
  externalTaskRunner?: SecurityCheckTaskRunner,
): Promise<SuspiciousFileResult[]> => {
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

  // Partition the regular files on the main thread before touching the worker
  // pool. Two cheap filters run here so the expensive `lintSource` engine call
  // (the dominant cost of the security phase) is dispatched for as few files as
  // possible:
  //
  //   1. The pre-filter (`mightContainSecret`) — the same check the worker
  //      applies. A file that fails it can never trigger any secretlint rule, so
  //      it is clean without the engine. Running it here (instead of only in the
  //      worker) means those files are never sent over IPC at all.
  //   2. The clean-verdict cache — for files that pass the pre-filter, a previous
  //      run may have verified the byte-identical content clean under the same
  //      secretlint rule version. A cache hit skips both the IPC and the engine
  //      call. Only clean verdicts are cached; suspicious files always miss and
  //      are re-scanned (so they are re-verified, and no secret text hits disk).
  //
  // Both filters are behavior-preserving: a pre-filter miss yields the same
  // `null` (clean) the worker would have returned, and a clean-cache hit replays
  // the clean verdict secretlint produced for byte-identical content under the
  // same rule version. Anything not resolved here is dispatched to the worker
  // exactly as before.
  const dispatchItems: SecurityCheckItem[] = [];
  // Cache key per dispatched item, used to record a fresh clean verdict back to
  // the cache (undefined for git items and any item that should not be cached).
  const dispatchCacheKeys: (string | undefined)[] = [];

  for (const file of rawFiles) {
    if (!mightContainSecret(file.content)) {
      // Pre-filter clear: identical to the worker's own skip — no finding possible.
      continue;
    }
    const cacheKey = securityResultCacheKey(file.content, file.path);
    if (getCachedSecurityResult(cacheKey) !== undefined) {
      // Known clean from a previous run (only clean verdicts are cached) — skip
      // the engine.
      continue;
    }
    dispatchItems.push({ filePath: file.path, content: file.content, type: 'file' });
    dispatchCacheKeys.push(cacheKey);
  }

  // Git diff/log items always go through the engine (never pre-filtered or
  // cached): added secret lines may lack a stable surrounding literal, and they
  // are few. They carry no cache key.
  for (const gitItem of [...gitDiffItems, ...gitLogItems]) {
    dispatchItems.push(gitItem);
    dispatchCacheKeys.push(undefined);
  }

  const totalItems = dispatchItems.length;

  // Everything resolved from the pre-filter / clean cache: no worker work needed.
  if (totalItems === 0) {
    return [];
  }

  // Reuse a pre-warmed pool when provided; otherwise create one here. The cap
  // mirrors `createSecurityCheckTaskRunner` so warm and lazy paths size identically.
  const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());

  // numOfTasks uses totalItems (not batches.length) to avoid under-sizing the pool.
  const taskRunner =
    externalTaskRunner ??
    deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: totalItems,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: maxSecurityWorkers,
    });

  // Split items into batches to reduce IPC round-trips. Batch boundaries align
  // with `dispatchItems`/`dispatchCacheKeys` indices so worker results can be
  // mapped back to their cache key for persistence.
  const batches: SecurityCheckItem[][] = [];
  for (let i = 0; i < dispatchItems.length; i += BATCH_SIZE) {
    batches.push(dispatchItems.slice(i, i + BATCH_SIZE));
  }

  try {
    logger.trace(`Starting security check for ${totalItems} files/content in ${batches.length} batches`);
    const startTime = process.hrtime.bigint();

    let completedItems = 0;

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

    // Worker results align positionally with `dispatchItems`. Record only the
    // CLEAN verdicts back to the cache, keyed per file (git items carry no key);
    // suspicious findings are intentionally never persisted so detected secret
    // text never reaches disk — those files are re-scanned next run.
    const flatResults = batchResults.flat();
    const workerSuspicious: SuspiciousFileResult[] = [];
    for (let i = 0; i < flatResults.length; i++) {
      const result = flatResults[i];
      const cacheKey = dispatchCacheKeys[i];
      if (result === null) {
        if (cacheKey !== undefined) {
          setCachedSecurityClean(cacheKey);
        }
      } else {
        workerSuspicious.push(result);
      }
    }

    return workerSuspicious;
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    // Only tear down the pool we created here; a pre-warmed runner is owned and
    // cleaned up by the caller.
    if (externalTaskRunner === undefined) {
      await taskRunner.cleanup();
    }
  }
};
