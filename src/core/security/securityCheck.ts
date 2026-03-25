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

/**
 * Quick pre-filter: check if file content contains any substring that could match
 * a secretlint rule. Each trigger corresponds to a required prefix/marker for rules in
 * @secretlint/secretlint-rule-preset-recommend v8.x:
 *
 * - AWS:        AKIA (access key ID prefix)
 * - Anthropic:  sk-ant- (API key prefix)
 * - BasicAuth:  ://  with  @ (URL with potential credentials)
 * - Database:   mongodb+srv://, postgres://, mysql://, redis://, amqp://
 * - GCP:        service_account, authorized_user (credential JSON markers)
 * - GitHub:     ghp_, gho_, ghu_, ghs_, ghr_, github_pat_
 * - Linear:     lin_api_
 * - NPM:        npm_
 * - OpenAI:     sk-proj- (project key prefix)
 * - PrivateKey:  -----BEGIN
 * - SendGrid:   SG.
 * - Shopify:    shpat_, shpca_, shppa_, shpss_, shpit_
 * - Slack:      xoxb-, xoxp-, xoxa-
 *
 * Files without any trigger are guaranteed to pass all secretlint rules.
 * Git diff/log content always goes through full checking (not pre-filtered).
 * For typical source repos, this skips 80-99% of files from the expensive
 * IPC + regex matching in worker threads.
 */
// Single compiled regex combining all secret trigger patterns.
// V8's irregexp engine compiles alternation into an automaton that scans the string once,
// replacing 27 separate .includes() calls (each scanning the full string) with a single pass.
// For files without secrets (95-99% of files), this reduces total bytes scanned from
// ~27× content length to ~1× content length.
const SECRET_TRIGGER_PATTERN =
  /AKIA|-----BEGIN|xoxb-|xoxp-|xoxa-|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|npm_|SG\.|shpat_|shpca_|shppa_|shpss_|shpit_|lin_api_|sk-ant-|sk-proj-|mongodb\+srv:\/\/|postgres:\/\/|mysql:\/\/|redis:\/\/|amqp:\/\/|service_account|authorized_user/;

export const contentMayContainSecret = (content: string): boolean => {
  // Short-circuit: files under 8 bytes can't contain any meaningful secret pattern
  if (content.length < 8) return false;

  return (
    SECRET_TRIGGER_PATTERN.test(content) ||
    // BasicAuth: requires both a URL scheme and @ in the same content
    (content.includes('://') && content.includes('@'))
  );
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

  // Pre-filter files that cannot match any secretlint rule.
  // Each trigger substring below corresponds to a required prefix or marker for at least one
  // rule in @secretlint/secretlint-rule-preset-recommend. Files without ANY trigger are
  // guaranteed to pass all rules, so they skip the expensive IPC + regex matching in workers.
  // For typical source code repos, this skips 95-99% of files.
  const fileTasks: SecurityCheckTask[] = [];
  for (const file of rawFiles) {
    if (contentMayContainSecret(file.content)) {
      fileTasks.push({ filePath: file.path, content: file.content, type: 'file' });
    }
  }

  logger.trace(`Security pre-filter: ${fileTasks.length}/${rawFiles.length} files need checking`);

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

    const results = batchResults.flat().filter((result): result is SuspiciousFileResult => result !== null);

    // Fire-and-forget worker pool cleanup — all results are already collected,
    // so we don't need to block the critical path waiting for thread termination.
    // The worker threads will be terminated when the process exits anyway (CLI tool).
    Promise.resolve(taskRunner.cleanup()).catch((error) => {
      logger.debug('Error during security worker pool cleanup:', error);
    });

    return results;
  } catch (error) {
    logger.error('Error during security check:', error);
    // On error, still attempt cleanup but don't block on it
    Promise.resolve(taskRunner.cleanup()).catch(() => {});
    throw error;
  }
};
