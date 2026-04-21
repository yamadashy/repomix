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
import type { SecurityCheckItem, SecurityCheckTask, SecurityCheckType } from './workers/securityCheckWorker.js';

export type { SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

export type SecurityCheckTaskRunner = TaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>;

export interface SecurityTaskRunnerWithWarmup {
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

// Cap security workers at 4. Earlier the cap was 2 to "reduce contention with the metrics
// worker pool", but on the default pack path the two pools execute in sequential phases
// — security inside `Promise.all([validateFileSafety, processFiles])`, and metrics inside
// `Promise.all([produceOutput, calculateMetrics])` after `sortOutputFiles` — so the metrics
// pool is idle during the security phase. (The `--skill-generate` path returns early before
// the metrics pool runs, so still no concurrent use there.) Claiming 4 cores for secretlint
// roughly halves security wall time on a ~1000-file repo. `getWorkerThreadCount` clips to
// `availableParallelism`, so a 2-CPU host still gets 2 workers — no regression on
// resource-constrained machines.
const MAX_SECURITY_WORKERS = 4;

// Create a security worker task runner and fire a no-op warmup task per worker
// so `@secretlint/core` and its rule preset load in parallel with the rest of
// the pack pipeline (searchFiles, collectFiles, fileProcess), removing the
// ~150ms worker-spawn + secretlint module-load cost from the critical path.
// Mirrors `createMetricsTaskRunner` in shape.
export const createSecurityTaskRunner = (
  numOfTasks: number,
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
): SecurityTaskRunnerWithWarmup => {
  const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());
  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: maxSecurityWorkers,
  });

  // Each warmup task has an empty `items` array, so the worker's file loop is
  // a no-op — only the module load cost is paid, once per worker.
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
  deps: {
    initTaskRunner?: typeof initTaskRunner;
    getProcessConcurrency?: typeof defaultGetProcessConcurrency;
    // Pre-warmed task runner from `createSecurityTaskRunner`. When supplied
    // the inner cleanup is skipped so the caller retains ownership of the
    // pool (cleaned up in `pack()`'s outer `finally`).
    taskRunner?: SecurityCheckTaskRunner;
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

  // Reuse a pre-warmed task runner when provided by `pack()` via
  // `createSecurityTaskRunner`; the caller then owns the pool lifecycle.
  const ownedTaskRunner = deps.taskRunner ?? null;
  // numOfTasks uses totalItems (not batches.length) to avoid under-sizing the pool.
  const taskRunner =
    ownedTaskRunner ??
    initTaskRunnerFn<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: totalItems,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: Math.min(MAX_SECURITY_WORKERS, getProcessConcurrencyFn()),
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
    // Only dispose of the pool when we created it ourselves. An externally
    // owned pool (pre-warmed by `pack()`) is cleaned up by the caller.
    if (!ownedTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
