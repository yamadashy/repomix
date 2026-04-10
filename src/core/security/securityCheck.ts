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
import { MAX_METRICS_WORKER_THREADS } from '../metrics/calculateMetrics.js';
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

// Hard cap on security workers. The actual count is further limited by
// getMaxSecurityWorkers() to avoid CPU oversubscription with the concurrent
// metrics worker pool.
const MAX_SECURITY_WORKER_THREADS = 2;

/**
 * Compute the effective number of security workers based on available CPU cores.
 * The security and metrics worker pools run concurrently during the parallel phase.
 * On systems with few cores (e.g., 4), running 3 metrics + 2 security + 1 main = 6
 * threads causes 50% CPU oversubscription, where context-switching overhead outweighs
 * the parallelism benefit. By scaling security workers down to 1 on small systems,
 * total threads stay at or below the core count, eliminating contention.
 */
const getMaxSecurityWorkers = (getProcessConcurrency: () => number): number => {
  const availableCores = getProcessConcurrency();
  // Reserve cores for: main thread (1) + metrics workers (up to MAX_METRICS_WORKER_THREADS)
  const headroom = availableCores - MAX_METRICS_WORKER_THREADS - 1;
  return Math.max(1, Math.min(MAX_SECURITY_WORKER_THREADS, headroom));
};

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// Security check always processes all files (~1000 in a typical repo), so a batch size of 50
// already produces ~20 batches — enough to distribute well across available CPU cores.
// (Unlike metrics, which may process only a small number of top files when tokenCountTree
// is disabled, and needs a smaller batch size to avoid one batch monopolizing a worker.)
const BATCH_SIZE = 50;

/**
 * Create a security task runner and warm up all worker threads by triggering
 * secretlint initialization in parallel. This allows the expensive module
 * loading (~200ms) to overlap with other pipeline stages (searchFiles,
 * collectFiles, processFiles).
 */
export const createSecurityTaskRunner = (
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
): SecurityTaskRunnerWithWarmup => {
  const maxSecurityWorkers = getMaxSecurityWorkers(deps.getProcessConcurrency);

  // Use a generous task estimate to ensure the pool scales to maxSecurityWorkers.
  // The estimate only affects worker count (via ceil(tasks/tasksPerThread)), not correctness.
  const estimatedTasks = 200;

  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks: estimatedTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: maxSecurityWorkers,
  });

  // Send one empty-batch task per worker to trigger secretlint module loading.
  // The worker loads @secretlint/core and @secretlint/secretlint-rule-preset-recommend
  // at import time (~200ms). The empty batch itself is near-instant.
  const { maxThreads } = getWorkerThreadCount(estimatedTasks, maxSecurityWorkers);
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
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
  preWarmedTaskRunner?: SecurityTaskRunner,
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

  // Use pre-warmed runner if available, otherwise create a new one.
  const ownsTaskRunner = !preWarmedTaskRunner;
  const taskRunner =
    preWarmedTaskRunner ??
    deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: totalItems,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
      maxWorkerThreads: getMaxSecurityWorkers(deps.getProcessConcurrency),
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
    // Only cleanup if we created the runner (not if it was pre-warmed externally)
    if (ownsTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
