import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
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

/**
 * Pre-create a security check task runner so worker threads can start loading
 * secretlint modules while other stages (e.g., file collection) are running.
 */
export const createSecurityTaskRunner = (
  numOfTasks: number,
): TaskRunner<SecurityCheckTask, SuspiciousFileResult | null> =>
  initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
  });

const defaultSecurityDeps = {
  initTaskRunner,
  taskRunner: undefined as TaskRunner<SecurityCheckTask, SuspiciousFileResult | null> | undefined,
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  overrideDeps: Partial<typeof defaultSecurityDeps> = {},
): Promise<SuspiciousFileResult[]> => {
  const deps = { ...defaultSecurityDeps, ...overrideDeps };
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

  // Use pre-warmed task runner if provided, otherwise create one
  const taskRunner =
    deps.taskRunner ??
    deps.initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
      numOfTasks: rawFiles.length + gitDiffTasks.length + gitLogTasks.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
  const ownTaskRunner = !deps.taskRunner;
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

  try {
    logger.trace(`Starting security check for ${tasks.length} files/content`);
    const startTime = process.hrtime.bigint();

    let completedTasks = 0;
    const totalTasks = tasks.length;

    const results = await Promise.all(
      tasks.map((task) =>
        taskRunner.run(task).then((result) => {
          completedTasks++;
          progressCallback(`Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(task.filePath)}`);
          logger.trace(`Running security check... (${completedTasks}/${totalTasks}) ${task.filePath}`);
          return result;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return results.filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    // Only cleanup if we created the task runner
    if (ownTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
