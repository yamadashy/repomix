import os from 'node:os';
import pc from 'picocolors';
import { logger, repomixLogLevels } from '../../shared/logger.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { SecurityCheckBatchTask, SecurityCheckTask, SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

type BatchTaskRunner = TaskRunner<SecurityCheckBatchTask, (SuspiciousFileResult | null)[]>;

/**
 * Pre-create a security check task runner so worker threads can start loading
 * secretlint modules while other stages (e.g., file collection) are running.
 */
export const createSecurityTaskRunner = (numOfTasks: number): BatchTaskRunner =>
  initTaskRunner<SecurityCheckBatchTask, (SuspiciousFileResult | null)[]>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
  });

const defaultSecurityDeps = {
  initTaskRunner,
  taskRunner: undefined as BatchTaskRunner | undefined,
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  overrideDeps: Partial<typeof defaultSecurityDeps> = {},
): Promise<SuspiciousFileResult[]> => {
  const deps = { ...defaultSecurityDeps, ...overrideDeps };
  const tasks: SecurityCheckTask[] = [];

  // Build task list: files + git diffs + git logs
  for (const file of rawFiles) {
    tasks.push({ filePath: file.path, content: file.content, type: 'file' });
  }

  if (gitDiffResult) {
    if (gitDiffResult.workTreeDiffContent) {
      tasks.push({ filePath: 'Working tree changes', content: gitDiffResult.workTreeDiffContent, type: 'gitDiff' });
    }
    if (gitDiffResult.stagedDiffContent) {
      tasks.push({ filePath: 'Staged changes', content: gitDiffResult.stagedDiffContent, type: 'gitDiff' });
    }
  }

  if (gitLogResult?.logContent) {
    tasks.push({ filePath: 'Git log history', content: gitLogResult.logContent, type: 'gitLog' });
  }

  // Use pre-warmed task runner if provided, otherwise create one
  const taskRunner =
    deps.taskRunner ??
    deps.initTaskRunner<SecurityCheckBatchTask, (SuspiciousFileResult | null)[]>({
      numOfTasks: tasks.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
  const ownTaskRunner = !deps.taskRunner;

  const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;

  try {
    logger.trace(`Starting security check for ${tasks.length} files/content`);
    const startTime = isTracing ? process.hrtime.bigint() : 0n;

    // Batch tasks into CPU-proportional chunks to reduce structured clone + message passing
    // overhead. With ~1000 individual tasks, the per-task overhead (~0.13ms each for
    // Promise allocation, task queuing, result delivery) totals ~127ms. Batching into
    // numCPUs * 2 chunks reduces this to <2ms while maintaining full worker parallelism.
    const numCPUs = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
    const numBatches = Math.max(1, Math.min(tasks.length, numCPUs * 2));
    const batchSize = Math.ceil(tasks.length / numBatches);

    const batches: SecurityCheckBatchTask[] = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      batches.push({ batch: tasks.slice(i, i + batchSize) });
    }

    progressCallback(`Running security check... (0/${tasks.length})`);

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const batchResults = await Promise.all(
      batches.map((batchTask) =>
        taskRunner.run(batchTask).then((results) => {
          completedTasks += batchTask.batch.length;
          const lastFile = batchTask.batch[batchTask.batch.length - 1];
          progressCallback(`Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(lastFile.filePath)}`);
          return results;
        }),
      ),
    );

    if (isTracing) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6;
      logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);
    }

    // Flatten batch results and filter nulls
    return batchResults.flat().filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    if (ownTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
