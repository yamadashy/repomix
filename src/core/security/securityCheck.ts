import pc from 'picocolors';
import type { Tinypool } from 'tinypool';
import { logger } from '../../shared/logger.js';
import {
  cleanupWorkerPool,
  createWorkerPoolSync,
  getProcessConcurrency as defaultGetProcessConcurrency,
  initTaskRunner,
  resolveTinypool,
  type TaskRunner,
} from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { SECRETLINT_PRESCAN } from './securityPrescan.js';
import type {
  SecurityCheckItem,
  SecurityCheckTask,
  SecurityCheckType,
  SuspiciousFileResult as WorkerSuspiciousFileResult,
} from './workers/securityCheckWorker.js';

export type { SecurityCheckType } from './workers/securityCheckWorker.js';

export type SecurityTaskRunner = TaskRunner<SecurityCheckTask, (WorkerSuspiciousFileResult | null)[]>;

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

export interface SecurityTaskRunnerWithWarmup {
  taskRunner: SecurityTaskRunner;
  warmupPromise: Promise<unknown>;
}

// Cap security workers at 1 to minimize CPU contention with the metrics worker
// pool, which is the pipeline bottleneck (~438ms wall vs ~88ms for security with
// 2 workers). With 1 security worker, the metrics pool faces less thread
// contention during warmup and processing. The security check wall time roughly
// doubles (~176ms with 1 worker), but this is still well below the metrics phase.
// Both phases scale linearly with file count, so metrics remains the bottleneck
// for repos of any size. Measured: −37ms (−3.6%) on a 4-core machine.
const MAX_SECURITY_WORKERS = 1;

/**
 * Create a security task runner and warm up all worker threads by dispatching
 * a no-op task to each. This forces the worker threads to spawn and load the
 * secretlint module (~97ms cold start per worker) in parallel with earlier
 * pipeline stages (file search, file collection), so that the first real
 * security check batch runs at full speed without a cold-start stall.
 */
export const createSecurityTaskRunner = async (
  numOfTasks: number,
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
): Promise<SecurityTaskRunnerWithWarmup> => {
  const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());

  const taskRunner = await deps.initTaskRunner<SecurityCheckTask, (WorkerSuspiciousFileResult | null)[]>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: maxSecurityWorkers,
  });

  // Dispatch one empty-items task per worker thread to trigger module loading.
  // Use `maxSecurityWorkers` (the same cap passed to `initTaskRunner`) rather than
  // `getWorkerThreadCount` which applies an additional TASKS_PER_THREAD throttle
  // and may undercount the threads Tinypool actually spawns.
  const warmupPromise = Promise.all(
    Array.from({ length: maxSecurityWorkers }, () => taskRunner.run({ items: [] }).catch(() => [])),
  );

  return { taskRunner, warmupPromise };
};

// Batch size for grouping suspect items into worker tasks.
// After main-thread prescan filtering (~97% of files skipped), typically only
// ~30 items remain — fitting in a single batch. The batch size of 50 handles
// overflow for repos with many suspect files while keeping IPC round-trips low.
const BATCH_SIZE = 50;

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps: {
    initTaskRunner: typeof initTaskRunner;
    getProcessConcurrency: typeof defaultGetProcessConcurrency;
    taskRunner?: SecurityTaskRunner;
  } = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
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

  const totalItems = rawFiles.length + gitDiffItems.length + gitLogItems.length;

  if (totalItems === 0) {
    return [];
  }

  // Pre-resolve the Tinypool constructor so that we can create a worker pool
  // SYNCHRONOUSLY inside the prescan loop below.  `resolveTinypool()` returns
  // almost instantly because the tinypool module was pre-loaded at ESM
  // evaluation time (see processConcurrency.ts:12).  Resolving here — before
  // the synchronous prescan loop — ensures that `new Tinypool(…)` can execute
  // inline without yielding to the microtask queue.
  const TinypoolCtor = deps.taskRunner ? null : await resolveTinypool();

  // Pre-filter items on the main thread using SECRETLINT_PRESCAN. ~97% of
  // items are eliminated, avoiding unnecessary Tinypool IPC round-trips.
  //
  // Key optimization: when the first suspect item is found, create the security
  // worker pool SYNCHRONOUSLY via `createWorkerPoolSync`.  Because there is no
  // `await` in the pool constructor, the OS thread is spawned immediately and
  // begins loading secretlint modules (~90ms) in its own V8 isolate — truly in
  // parallel with the remaining prescan regex work on the main thread (~20-25ms
  // for the remaining files).  For repos with suspect files (docs mentioning
  // API patterns, test files with mock secrets), this hides most of the worker
  // cold-start behind the prescan.  For clean repos (~95%), no suspect is ever
  // found and no worker is created.
  const suspectItems: SecurityCheckItem[] = [];
  let earlyPool: Tinypool | null = null;

  for (let i = 0; i < rawFiles.length; i++) {
    if (SECRETLINT_PRESCAN.test(rawFiles[i].content)) {
      suspectItems.push({ filePath: rawFiles[i].path, content: rawFiles[i].content, type: 'file' });

      // Create worker pool synchronously on first suspect.
      // numOfTasks uses totalItems (not suspectItems.length) because we don't
      // yet know the final suspect count — the prescan loop is still running.
      // With MAX_SECURITY_WORKERS=1 this has no effect on thread count.
      if (!earlyPool && TinypoolCtor) {
        earlyPool = createWorkerPoolSync(TinypoolCtor, {
          numOfTasks: totalItems,
          workerType: 'securityCheck',
          runtime: 'worker_threads',
          maxWorkerThreads: Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency()),
        });
      }
    }
  }

  // Also scan git diff/log items (typically 0-3 items, negligible cost).
  // Note: earlyPool is NOT created here — the git-only suspect case is rare
  // and falls through to the initTaskRunner fallback below.
  for (const item of gitDiffItems) {
    if (SECRETLINT_PRESCAN.test(item.content)) {
      suspectItems.push(item);
    }
  }
  for (const item of gitLogItems) {
    if (SECRETLINT_PRESCAN.test(item.content)) {
      suspectItems.push(item);
    }
  }

  const skippedCount = totalItems - suspectItems.length;

  // Invariant: earlyPool is non-null ONLY when suspectItems is non-empty,
  // because the pool is created inside the branch that also pushes to
  // suspectItems.  This means the early-return below never leaks a pool.
  if (suspectItems.length === 0) {
    logger.trace(`Security pre-scan: all ${totalItems} items skipped (no patterns matched)`);
    return [];
  }

  logger.trace(`Security pre-scan: ${skippedCount}/${totalItems} items skipped, ${suspectItems.length} items to check`);

  // Use pre-warmed task runner if provided, the early-created pool from the
  // prescan loop, or create one as a final fallback.
  // Capture earlyPool into a const so TypeScript narrows the type inside the
  // closures below (mutable `let` variables are not narrowed in closures).
  const resolvedPool = earlyPool;
  const ownedTaskRunner = !deps.taskRunner;
  const taskRunner: SecurityTaskRunner =
    deps.taskRunner ??
    (resolvedPool
      ? { run: (task: SecurityCheckTask) => resolvedPool.run(task), cleanup: () => cleanupWorkerPool(resolvedPool) }
      : await (async () => {
          const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());
          return deps.initTaskRunner<SecurityCheckTask, (WorkerSuspiciousFileResult | null)[]>({
            numOfTasks: suspectItems.length,
            workerType: 'securityCheck',
            runtime: 'worker_threads',
            maxWorkerThreads: maxSecurityWorkers,
          });
        })());

  // Batch the suspect items. Typically ~30 items -> 1 batch with BATCH_SIZE=50,
  // down from ~20 batches of 50 when all items were sent unfiltered.
  const batches: SecurityCheckItem[][] = [];
  for (let i = 0; i < suspectItems.length; i += BATCH_SIZE) {
    batches.push(suspectItems.slice(i, i + BATCH_SIZE));
  }

  try {
    logger.trace(`Starting security check for ${suspectItems.length} suspect items in ${batches.length} batches`);
    const startTime = process.hrtime.bigint();

    let completedItems = 0;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const results = await taskRunner.run({ items: batch });

        completedItems += batch.length;
        const lastItem = batch[batch.length - 1];
        progressCallback(
          `Running security check... (${skippedCount + completedItems}/${totalItems}) ${pc.dim(lastItem.filePath)}`,
        );
        logger.trace(`Running security check... (${skippedCount + completedItems}/${totalItems}) ${lastItem.filePath}`);

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
    if (ownedTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
