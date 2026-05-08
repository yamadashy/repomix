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

  const ownsTaskRunner = !deps.taskRunner;

  // numOfTasks uses totalItems (not batches.length) to avoid under-sizing the pool.
  const taskRunner =
    deps.taskRunner ??
    initTaskRunnerFn<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: totalItems,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: Math.min(MAX_SECURITY_WORKER_THREADS, getProcessConcurrencyFn()),
    });

  // Split items into batches to reduce IPC round-trips
  const batches: SecurityCheckItem[][] = [];
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    batches.push(allItems.slice(i, i + BATCH_SIZE));
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
