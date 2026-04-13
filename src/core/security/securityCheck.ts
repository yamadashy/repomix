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
export const createSecurityTaskRunner = (
  numOfTasks: number,
  deps = {
    initTaskRunner,
    getProcessConcurrency: defaultGetProcessConcurrency,
  },
): SecurityTaskRunnerWithWarmup => {
  const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());

  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (WorkerSuspiciousFileResult | null)[]>({
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

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// Security check always processes all files (~1000 in a typical repo), so a batch size of 50
// already produces ~20 batches — enough to distribute well across available CPU cores.
// Metrics uses the same batch size of 50 for consistency; when tokenCountTree is disabled
// and only ~50 files are processed, the single resulting batch leaves other workers free
// for concurrent git-log/output tokenization tasks.
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

  // Use pre-warmed task runner if provided, otherwise create one on the spot
  const ownedTaskRunner = !deps.taskRunner;
  const taskRunner =
    deps.taskRunner ??
    (() => {
      const maxSecurityWorkers = Math.min(MAX_SECURITY_WORKERS, deps.getProcessConcurrency());
      return deps.initTaskRunner<SecurityCheckTask, (WorkerSuspiciousFileResult | null)[]>({
        numOfTasks: totalItems,
        workerType: 'securityCheck',
        runtime: 'worker_threads',
        maxWorkerThreads: maxSecurityWorkers,
      });
    })();

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
    if (ownedTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
