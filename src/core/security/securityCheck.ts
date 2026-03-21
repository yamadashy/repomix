import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { getProcessConcurrency, initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
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

// Target number of files per batch task to reduce worker message overhead
const FILES_PER_BATCH = 50;

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

  const allTasks = [
    ...rawFiles.map(
      (file) =>
        ({
          filePath: file.path,
          content: file.content,
          type: 'file',
        }) satisfies SecurityCheckTask,
    ),
    ...gitDiffTasks,
    ...gitLogTasks,
  ];

  // Use pre-initialized task runner if provided (allows overlapping worker startup with earlier phases),
  // otherwise create one.
  const externalTaskRunner = deps.taskRunner;
  const taskRunner =
    externalTaskRunner ??
    deps.initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
      numOfTasks: allTasks.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });

  try {
    logger.trace(`Starting security check for ${allTasks.length} files/content`);
    const startTime = process.hrtime.bigint();

    // Batch files into groups to reduce worker message overhead.
    // Instead of sending N individual tasks (one per file), send N/FILES_PER_BATCH batch tasks.
    const concurrency = getProcessConcurrency();
    const batchSize = Math.max(1, Math.min(FILES_PER_BATCH, Math.ceil(allTasks.length / concurrency)));
    const batches: SecurityCheckTask[][] = [];
    for (let i = 0; i < allTasks.length; i += batchSize) {
      batches.push(allTasks.slice(i, i + batchSize));
    }

    logger.trace(`Batched ${allTasks.length} tasks into ${batches.length} batches (batch size: ${batchSize})`);

    let completedTasks = 0;
    const totalTasks = allTasks.length;

    const batchResults = await Promise.all(
      batches.map(async (batch) => {
        const batchTask: SecurityCheckBatchTask = { items: batch };

        if (!taskRunner.runNamed) {
          throw new Error('taskRunner.runNamed is required for batch security checking');
        }

        const results = await taskRunner.runNamed<SecurityCheckBatchTask, (SuspiciousFileResult | null)[]>(
          batchTask,
          'runSecurityCheckBatch',
        );

        completedTasks += batch.length;
        const lastFile = batch[batch.length - 1];
        progressCallback(`Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(lastFile.filePath)}`);
        logger.trace(`Running security check... (${completedTasks}/${totalTasks})`);

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
    // Only cleanup if we created the task runner (external runners are managed by the caller)
    if (!externalTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
