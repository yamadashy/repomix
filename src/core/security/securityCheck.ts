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

// Batch size for grouping files into worker tasks to reduce IPC overhead.
// Each batch is sent as a single message to a worker thread, avoiding
// per-file round-trip costs that dominate when processing many files.
// Security check always processes all files (~1000 in a typical repo), so a batch size of 50
// already produces ~20 batches — enough to distribute well across available CPU cores.
// (Unlike metrics, which may process only a small number of top files when tokenCountTree
// is disabled, and needs a smaller batch size to avoid one batch monopolizing a worker.)
export const SECURITY_BATCH_SIZE = 50;

// Cap at 1 worker. The streaming pipeline overlaps the security scan with
// file I/O, and a single worker handles ~20 batches at ~6ms each (~120ms
// total) well within the typical ~400ms collect window. A second worker
// added meaningful CPU contention with the file-read main thread and the
// metrics worker pool warming up in parallel, eating most of the win.
const getMaxSecurityWorkers = (deps = { getProcessConcurrency: defaultGetProcessConcurrency }): number =>
  Math.min(1, deps.getProcessConcurrency());

/**
 * Build a stand-alone task runner for the security check so the caller can
 * dispatch worker tasks while file collection is still in flight, overlapping
 * the secretlint scan with file I/O and removing the security stage from the
 * critical path between collect and output generation.
 */
export const createSecurityCheckTaskRunner = (
  numOfTasks: number,
  deps = { initTaskRunner, getProcessConcurrency: defaultGetProcessConcurrency },
): SecurityCheckTaskRunner =>
  deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: getMaxSecurityWorkers({ getProcessConcurrency: deps.getProcessConcurrency }),
  });

/**
 * Dispatch a single batch of files to the security worker pool. Returned
 * suspicious entries are flat-mapped from the worker's nullable result array.
 */
export const dispatchSecurityFileBatch = async (
  taskRunner: SecurityCheckTaskRunner,
  batch: RawFile[],
): Promise<SuspiciousFileResult[]> => {
  if (batch.length === 0) return [];
  const items: SecurityCheckItem[] = batch.map((file) => ({
    filePath: file.path,
    content: file.content,
    type: 'file',
  }));
  const results = await taskRunner.run({ items });
  return results.filter((result): result is SuspiciousFileResult => result !== null);
};

/**
 * Run the security check on git diff/log content using a pre-built task
 * runner. File-level checks are dispatched separately via
 * `dispatchSecurityFileBatch` so they can overlap with file collection.
 */
export const runGitSecurityCheck = async (
  taskRunner: SecurityCheckTaskRunner,
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
): Promise<SuspiciousFileResult[]> => {
  const items: SecurityCheckItem[] = [];

  if (gitDiffResult) {
    if (gitDiffResult.workTreeDiffContent) {
      items.push({
        filePath: 'Working tree changes',
        content: gitDiffResult.workTreeDiffContent,
        type: 'gitDiff',
      });
    }
    if (gitDiffResult.stagedDiffContent) {
      items.push({
        filePath: 'Staged changes',
        content: gitDiffResult.stagedDiffContent,
        type: 'gitDiff',
      });
    }
  }

  if (gitLogResult?.logContent) {
    items.push({
      filePath: 'Git log history',
      content: gitLogResult.logContent,
      type: 'gitLog',
    });
  }

  if (items.length === 0) return [];

  const results = await taskRunner.run({ items });
  return results.filter((result): result is SuspiciousFileResult => result !== null);
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

  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
    numOfTasks: totalItems,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
    maxWorkerThreads: getMaxSecurityWorkers({ getProcessConcurrency: deps.getProcessConcurrency }),
  });

  // Split items into batches to reduce IPC round-trips
  const batches: SecurityCheckItem[][] = [];
  for (let i = 0; i < allItems.length; i += SECURITY_BATCH_SIZE) {
    batches.push(allItems.slice(i, i + SECURITY_BATCH_SIZE));
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
