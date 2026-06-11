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

export type SecurityTaskRunner = TaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>;

export interface SecurityTaskRunnerWithWarmup {
  taskRunner: SecurityTaskRunner;
  warmupPromise: Promise<unknown>;
}

/**
 * Create the security-check task runner and eagerly warm up its worker threads.
 *
 * Spawning a security worker is expensive (~50-100ms each: thread creation plus
 * loading the @secretlint preset bundle) and previously happened inside
 * `runSecurityCheck`, i.e. after file collection finished — squarely on the
 * critical path of the pack pipeline. Creating the runner early in `pack()`
 * lets the spawn and module loading overlap with file collection and git
 * subprocesses instead.
 *
 * The warm-up posts one empty-items task per worker. An empty batch makes the
 * worker's handler return `[]` without linting anything, so the only effect is
 * forcing Tinypool to spawn the thread and import the secretlint modules. The
 * warm-up count mirrors the pool's own sizing (ceil(numOfTasks/100) capped at
 * 2 workers — i.e. 1 worker up to 100 items, 2 from 101) so no thread is
 * spawned that the real workload would not have spawned anyway.
 */
export const createSecurityCheckTaskRunner = (
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

  // Match Tinypool's maxThreads sizing (min(concurrency, ceil(numOfTasks/100), cap))
  // so the warm-up never tries to spawn more threads than the pool allows.
  const warmupCount = Math.max(1, Math.min(maxSecurityWorkers, Math.ceil(numOfTasks / 100)));
  const warmupPromise = Promise.all(
    Array.from({ length: warmupCount }, () => taskRunner.run({ items: [] }).catch(() => [])),
  );

  return { taskRunner, warmupPromise };
};

const defaultDeps = {
  initTaskRunner,
  getProcessConcurrency: defaultGetProcessConcurrency,
  // Optional pre-created task runner (see createSecurityCheckTaskRunner). When
  // provided, the caller owns its lifecycle and runSecurityCheck must not
  // clean it up.
  taskRunner: undefined as SecurityTaskRunner | undefined,
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  overrideDeps: Partial<typeof defaultDeps> = {},
): Promise<SuspiciousFileResult[]> => {
  const deps = { ...defaultDeps, ...overrideDeps };
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

  // Reuse a pre-created task runner when provided (its workers were warmed up
  // earlier in the pipeline, overlapping with file collection); otherwise
  // create one here. numOfTasks uses totalItems (not batches.length) to avoid
  // under-sizing the pool.
  const ownsTaskRunner = deps.taskRunner === undefined;
  const taskRunner =
    deps.taskRunner ??
    deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: totalItems,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency()),
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
    // A pre-created runner is cleaned up by its owner (pack()'s finally block),
    // which can overlap the destroy with later pipeline stages.
    if (ownsTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
