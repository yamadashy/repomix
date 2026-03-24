import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { initTaskRunner as InitTaskRunnerType, TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { SecurityCheckTask, SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

// Batch task runner: sends multiple files per IPC round-trip to reduce
// structured clone overhead (~20 files/batch vs 1 file/task).
export type SecurityTaskRunner = TaskRunner<SecurityCheckTask[], (SuspiciousFileResult | null)[]>;

// Lazy-load tinypool — defers ~20ms of module loading until security check actually starts,
// reducing worker process startup time so the worker is ready to receive tasks sooner.
let _initTaskRunner: typeof InitTaskRunnerType | undefined;
const getInitTaskRunner = async (): Promise<typeof InitTaskRunnerType> => {
  if (!_initTaskRunner) {
    const mod = await import('../../shared/processConcurrency.js');
    _initTaskRunner = mod.initTaskRunner;
  }
  return _initTaskRunner;
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps: {
    initTaskRunner: typeof InitTaskRunnerType;
  } | null = null,
  preCreatedTaskRunner?: SecurityTaskRunner,
): Promise<SuspiciousFileResult[]> => {
  const gitDiffTasks: SecurityCheckTask[] = [];
  const gitLogTasks: SecurityCheckTask[] = [];

  // Add Git diff content for security checking if available
  if (gitDiffResult) {
    if (gitDiffResult.workTreeDiffContent) {
      gitDiffTasks.push({
        filePath: 'Working tree changes',
        content: gitDiffResult.workTreeDiffContent,
        type: 'gitDiff',
      });
    }

    if (gitDiffResult.stagedDiffContent) {
      gitDiffTasks.push({
        filePath: 'Staged changes',
        content: gitDiffResult.stagedDiffContent,
        type: 'gitDiff',
      });
    }
  }

  // Add Git log content for security checking if available
  if (gitLogResult) {
    if (gitLogResult.logContent) {
      gitLogTasks.push({
        filePath: 'Git log history',
        content: gitLogResult.logContent,
        type: 'gitLog',
      });
    }
  }

  const fileTasks = rawFiles.map(
    (file) =>
      ({
        filePath: file.path,
        content: file.content,
        type: 'file',
      }) satisfies SecurityCheckTask,
  );

  // Combine file tasks, Git diff tasks, and Git log tasks
  const tasks = [...fileTasks, ...gitDiffTasks, ...gitLogTasks];

  // Use pre-created pool if available (pre-warmed during file collection),
  // otherwise create a new one on demand
  let taskRunner: SecurityTaskRunner;
  if (preCreatedTaskRunner) {
    taskRunner = preCreatedTaskRunner;
  } else {
    const resolvedDeps = deps ?? {
      initTaskRunner: await getInitTaskRunner(),
    };
    taskRunner = resolvedDeps.initTaskRunner<SecurityCheckTask[], (SuspiciousFileResult | null)[]>({
      numOfTasks: tasks.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
  }

  try {
    logger.trace(`Starting security check for ${tasks.length} files/content`);
    const startTime = process.hrtime.bigint();

    // Batch tasks to reduce IPC overhead. Each pool.run() involves structured clone
    // serialization of file content across the worker_thread boundary. Batching ~20 files
    // per round-trip amortizes the per-message overhead (~0.5ms) across multiple files,
    // reducing total IPC from ~979 round-trips to ~50.
    const BATCH_SIZE = 20;
    const batches: SecurityCheckTask[][] = [];
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      batches.push(tasks.slice(i, i + BATCH_SIZE));
    }

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const batchResults = await Promise.all(
      batches.map((batch) =>
        taskRunner.run(batch).then((results) => {
          completedTasks += batch.length;
          const lastTask = batch[batch.length - 1];
          progressCallback(`Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(lastTask.filePath)}`);
          logger.trace(`Running security check... (${completedTasks}/${totalTasks}) ${lastTask.filePath}`);
          return results;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return batchResults.flat().filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    // Always cleanup worker pool
    await taskRunner.cleanup();
  }
};
