import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import {
  getProcessConcurrency as defaultGetProcessConcurrency,
  initTaskRunner,
} from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { SecurityCheckItem, SecurityCheckTask, SuspiciousFileResult } from './workers/securityCheckWorker.js';

export type { SecurityCheckType, SuspiciousFileResult } from './workers/securityCheckWorker.js';

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// Security check always processes all files (~1000 in a typical repo), so a batch size of 50
// already produces ~20 batches — enough to distribute well across available CPU cores.
// (Unlike metrics, which may process only a small number of top files when tokenCountTree
// is disabled, and needs a smaller batch size to avoid one batch monopolizing a worker.)
const BATCH_SIZE = 50;

// The pool keeps at least this many workers when the machine has them. It is also the fixed
// cap on Bun.
const MIN_SECURITY_WORKER_CAP = 2;

// Files per squared worker in the square-root rule below. 150 keeps repositories of up to
// 600 files at two workers, where extra workers only added start-up cost.
const SECURITY_TASKS_PER_SQUARED_THREAD = 150;

/**
 * Upper bound for the security check worker pool.
 *
 * Scanning is CPU-bound regex work that scales with repository size, and the main thread
 * mostly waits while it runs. Each worker also has a fixed start-up cost, so the count grows
 * with the square root of the item count: 2 workers up to 600 items, 4 at 2,000, 7 at 7,000.
 * On an 18-core machine this cuts a 7,000-file pack by about 9% and a 21,000-file pack by
 * 24-29% compared with a fixed cap of 2.
 *
 * The count stops at half the cores because the metrics pool warms up at the same time: with
 * a cold token cache, a security pool of three quarters of the cores or more made the whole
 * run up to twice as slow on Linux.
 *
 * Bun keeps the fixed cap of 2. With 6 or more security workers a cold 2,000-file pack took
 * almost twice as long there, and its timings were too noisy to fit a rule.
 */
export const getSecurityCheckMaxWorkerThreads = (
  numOfItems: number,
  processConcurrency = defaultGetProcessConcurrency(),
  isBun = Boolean(process.versions.bun),
): number => {
  if (isBun) {
    return Math.max(1, Math.min(MIN_SECURITY_WORKER_CAP, processConcurrency));
  }

  const threadsForItems = Math.ceil(Math.sqrt(numOfItems / SECURITY_TASKS_PER_SQUARED_THREAD));
  const coreCap = Math.max(MIN_SECURITY_WORKER_CAP, Math.floor(processConcurrency / 2));
  const cap = Math.max(MIN_SECURITY_WORKER_CAP, Math.min(threadsForItems, coreCap));
  return Math.max(1, Math.min(cap, processConcurrency));
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
  signal?: AbortSignal,
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

  // The pool is further limited to one worker per 100 items, so the smallest repositories
  // start a single worker.
  const maxSecurityWorkers = getSecurityCheckMaxWorkerThreads(totalItems, deps.getProcessConcurrency());

  // numOfTasks uses totalItems (not batches.length) to avoid under-sizing the pool.
  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks: totalItems,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: maxSecurityWorkers,
    signal,
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
    await taskRunner.cleanup();
  }
};
