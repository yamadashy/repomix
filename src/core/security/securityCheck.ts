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
    // Only tear down the pool we created here; a pre-warmed runner is owned and
    // cleaned up by the caller.
    if (externalTaskRunner === undefined) {
      await taskRunner.cleanup();
    }
  }
};
