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
import {
  mightContainSecret,
  type SecurityCheckItem,
  type SecurityCheckTask,
  type SecurityCheckType,
} from './workers/securityCheckWorker.js';

export type { SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

// Batch size for grouping files into worker tasks to reduce IPC overhead.
const BATCH_SIZE = 50;

// Always run security checks on the main thread. Security worker threads loading @secretlint
// cause severe CPU contention with the metrics worker pool (either during gpt-tokenizer
// warmup or during tokenization), extending the pipeline from ~2s to ~9s on 4-core machines.
// On the main thread, @secretlint loads once (~40ms) and lintSource runs ~2-4ms per item,
// which is fast enough even for hundreds of candidates while avoiding worker thread overhead.
const MAIN_THREAD_THRESHOLD = Number.MAX_SAFE_INTEGER;

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
  // Pre-filter files on the main thread to avoid IPC overhead for files that clearly
  // don't contain secrets. This eliminates structured-clone serialization of file content
  // for skipped files, reducing both memory pressure and worker thread contention.
  const fileItems: SecurityCheckItem[] = rawFiles
    .filter((file) => mightContainSecret(file.content))
    .map((file) => ({
      filePath: file.path,
      content: file.content,
      type: 'file' as const,
    }));

  // Pre-filter git diff/log content too. The worker-side mightContainSecret() check would
  // skip these anyway, but pre-filtering avoids creating the worker pool entirely when all
  // items are filtered out — eliminating worker thread CPU contention with metrics warmup.
  const gitItems: SecurityCheckItem[] = [];
  if (gitDiffResult?.workTreeDiffContent && mightContainSecret(gitDiffResult.workTreeDiffContent)) {
    gitItems.push({ filePath: 'Working tree changes', content: gitDiffResult.workTreeDiffContent, type: 'gitDiff' });
  }
  if (gitDiffResult?.stagedDiffContent && mightContainSecret(gitDiffResult.stagedDiffContent)) {
    gitItems.push({ filePath: 'Staged changes', content: gitDiffResult.stagedDiffContent, type: 'gitDiff' });
  }
  if (gitLogResult?.logContent && mightContainSecret(gitLogResult.logContent)) {
    gitItems.push({ filePath: 'Git log history', content: gitLogResult.logContent, type: 'gitLog' });
  }

  const allItems = [...fileItems, ...gitItems];
  const totalItems = allItems.length;

  if (totalItems === 0) {
    return [];
  }

  // Always run on the main thread to avoid worker pool overhead and CPU contention
  // with the metrics worker pool. Keyword pre-filtering typically reduces candidates
  // to single digits, and even hundreds of items complete in ~1-2s on the main thread.
  if (totalItems <= MAIN_THREAD_THRESHOLD) {
    return runSecurityCheckOnMainThread(allItems, progressCallback);
  }

  return runSecurityCheckWithWorkers(allItems, progressCallback, deps);
};

const runSecurityCheckOnMainThread = async (
  allItems: SecurityCheckItem[],
  progressCallback: RepomixProgressCallback,
): Promise<SuspiciousFileResult[]> => {
  const totalItems = allItems.length;
  logger.trace(`Starting security check for ${totalItems} items on main thread`);
  const startTime = process.hrtime.bigint();

  // Lazy-load secretlint to avoid paying the import cost when security is disabled
  const { runSecretLint, createSecretLintConfig } = await import('./workers/securityCheckWorker.js');
  const config = createSecretLintConfig();

  const results: (SuspiciousFileResult | null)[] = [];
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    results.push(await runSecretLint(item.filePath, item.content, item.type, config));
    if ((i + 1) % 10 === 0 || i === totalItems - 1) {
      progressCallback(`Running security check... (${i + 1}/${totalItems}) ${pc.dim(item.filePath)}`);
    }
  }

  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e6;
  logger.trace(`Security check completed in ${duration.toFixed(2)}ms (main thread)`);

  return results.filter((result): result is SuspiciousFileResult => result !== null);
};

const runSecurityCheckWithWorkers = async (
  allItems: SecurityCheckItem[],
  progressCallback: RepomixProgressCallback,
  deps: {
    initTaskRunner: typeof initTaskRunner;
    getProcessConcurrency: typeof defaultGetProcessConcurrency;
  },
): Promise<SuspiciousFileResult[]> => {
  const totalItems = allItems.length;

  // Cap security workers at 2 to reduce contention with the metrics worker pool that
  // runs concurrently. The security check uses coarse-grained batches (BATCH_SIZE=50),
  // so 2 workers provide sufficient parallelism even for large repos (1000 files = 20 batches).
  const maxSecurityWorkers = Math.min(2, deps.getProcessConcurrency());

  const taskRunner = deps.initTaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>({
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
    // Fire-and-forget: the security worker pool cleanup (~40ms) runs in the background
    // while subsequent pipeline stages (output generation, metrics) proceed.
    Promise.resolve(taskRunner.cleanup()).catch((error) => {
      logger.debug('Security worker pool cleanup error:', error);
    });
  }
};
