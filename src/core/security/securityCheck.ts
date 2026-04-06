import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import { initTaskRunner, type TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { SecurityCheckItem, SuspiciousFileResult } from './secretLintRunner.js';
import type { SecurityCheckTask } from './workers/securityCheckWorker.js';

export type { SecurityCheckItem, SecurityCheckType, SuspiciousFileResult } from './secretLintRunner.js';

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps = {
    initTaskRunner: initTaskRunner as (options: {
      numOfTasks: number;
      workerType: 'securityCheck';
      runtime: 'worker_threads';
    }) => TaskRunner<SecurityCheckTask, (SuspiciousFileResult | null)[]>,
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

  const allItems = [...fileItems, ...gitDiffItems, ...gitLogItems];
  const totalItems = allItems.length;

  if (totalItems === 0) {
    return [];
  }

  logger.trace(`Starting security check for ${totalItems} files/content`);
  const startTime = process.hrtime.bigint();

  // Run security check in a dedicated worker thread to isolate secretlint's
  // V8 JIT pollution from the main thread. Secretlint's regex-heavy rule
  // evaluation degrades V8's optimized code paths for subsequent string
  // operations (e.g., Handlebars template rendering), causing a ~17x slowdown
  // in output generation when run on the main thread.
  const taskRunner = deps.initTaskRunner({
    numOfTasks: 1,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
  });

  try {
    progressCallback(`Running security check... (0/${totalItems}) ${pc.dim('starting...')}`);

    const results = await taskRunner.run({ items: allItems });

    const suspiciousResults = results.filter((r): r is SuspiciousFileResult => r !== null);

    progressCallback(`Running security check... (${totalItems}/${totalItems}) ${pc.dim('done')}`);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return suspiciousResults;
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  } finally {
    await taskRunner.cleanup();
  }
};
