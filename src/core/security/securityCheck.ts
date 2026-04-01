import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type {
  SecurityCheckBatchResult,
  SecurityCheckBatchTask,
  SecurityCheckTask,
  SecurityCheckType,
} from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

/**
 * Create a security task runner that can be pre-initialized to overlap
 * @secretlint module loading with other pipeline stages (e.g., file search).
 */
export const createSecurityTaskRunner = (
  numOfTasks: number,
): TaskRunner<SecurityCheckTask, SuspiciousFileResult | null> => {
  return initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
  });
};

// Target ~200KB of content per batch to balance worker round-trip overhead against task granularity.
// With ~992 files totaling ~4MB, this yields ~20 batches instead of ~992 individual tasks,
// reducing worker thread message-passing overhead by ~98%.
const TARGET_CHARS_PER_BATCH = 200_000;

const createBatches = (tasks: SecurityCheckTask[]): SecurityCheckTask[][] => {
  const batches: SecurityCheckTask[][] = [];
  let currentBatch: SecurityCheckTask[] = [];
  let currentSize = 0;

  for (const task of tasks) {
    currentBatch.push(task);
    currentSize += task.content.length;
    if (currentSize >= TARGET_CHARS_PER_BATCH) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps: {
    initTaskRunner: typeof initTaskRunner;
    taskRunner?: TaskRunner<SecurityCheckTask, SuspiciousFileResult | null>;
  } = {
    initTaskRunner,
  },
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
  const allTasks = [...fileTasks, ...gitDiffTasks, ...gitLogTasks];

  logger.trace(`Starting security check for ${allTasks.length} files/content`);
  const startTime = process.hrtime.bigint();

  // Create batches BEFORE the worker pool so thread count can be based on the actual
  // number of dispatched tasks. With ~20 batches, scaling by BATCHES_PER_THREAD (~10)
  // yields 2 worker threads instead of 4, which is optimal because:
  // - Each thread independently loads @secretlint/core (~94ms). 4 threads loading
  //   simultaneously on 4 cores causes significant CPU contention.
  // - 2 threads balance module loading cost against parallel scanning benefit,
  //   reducing security check time by ~37ms (~20%) compared to 4 threads.
  const batches = createBatches(allTasks);
  logger.trace(`Created ${batches.length} batches from ${allTasks.length} tasks`);

  // Use pre-warmed task runner if provided (module loading already overlapped with search),
  // otherwise create a new one. Scale batch count to yield ~2 worker threads for typical
  // repos (~20 batches), balancing module loading cost against parallel scanning benefit.
  const BATCHES_PER_THREAD = 10;
  const externalTaskRunner = !!deps.taskRunner;
  const taskRunner =
    deps.taskRunner ??
    deps.initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
      numOfTasks: batches.length * BATCHES_PER_THREAD,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });

  try {
    let completedTasks = 0;
    const totalTasks = allTasks.length;

    const batchResultArrays = await Promise.all(
      batches.map(async (batch) => {
        const batchTask: SecurityCheckBatchTask = { batch };

        // Cast needed: the underlying Tinypool pool handles both single and batch tasks,
        // but the TaskRunner generic is typed for single tasks. The worker detects batch
        // tasks via the 'batch' property and returns SecurityCheckBatchResult.
        const run = taskRunner.run as unknown as (task: SecurityCheckBatchTask) => Promise<SecurityCheckBatchResult>;
        const result = await run(batchTask);

        completedTasks += batch.length;
        const lastTask = batch[batch.length - 1];
        progressCallback(`Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(lastTask.filePath)}`);
        logger.trace(`Running security check... (${completedTasks}/${totalTasks}) ${lastTask.filePath}`);

        return result.results;
      }),
    );

    const results = batchResultArrays.flat();

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return results.filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    if (!externalTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
