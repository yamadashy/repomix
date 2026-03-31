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

// Lightweight regex that matches trigger patterns for all secretlint-rule-preset-recommend rules.
// Files that don't match can safely skip the expensive worker-based secretlint analysis.
// This is intentionally broad (false positives are safe; false negatives would be a security gap).
// Must be updated when secretlint-rule-preset-recommend adds new rules.
//
// Covers:
// - AWS: access key IDs (AKIA/ASIA/A3T...) and secret access key assignments
// - GCP: private keys in .json/.p12 (-----BEGIN PRIVATE KEY)
// - Private keys: RSA/EC/DSA/OPENSSH/PGP
// - NPM: tokens (npm_) and .npmrc auth (_authToken)
// - Basic auth: URLs with credentials (https/http/ftp/ftps://user:pass@)
// - Slack: bot/user/app/refresh tokens (xox[bpoasr]-, xapp-) and webhook URLs
// - SendGrid: API keys (SG.*)
// - Shopify: tokens (shpat_/shpss_/shpca_/shppa_)
// - GitHub: classic tokens (gh[pousr]_) and fine-grained PATs (github_pat_)
// - OpenAI/Anthropic: API keys (sk-)
// - Linear: API keys (lin_api_)
// - 1Password: service account tokens (ops_/op_)
// - Database: connection strings (mongodb/postgres/mysql/mysqlx/mssql/oracle/redis/amqp/elasticsearch)
export const SECRET_TRIGGER_PATTERN =
  /AKIA|ASIA|A3T[A-Z0-9]|SECRET_ACCESS_KEY|secret_access_key|-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY|npm_[a-zA-Z0-9]{36}|_authToken|(?:https?|ftps?):\/\/[^\s:@]+:[^\s:@]+@|xox[bpoasr]-|xapp-|hooks\.slack\.com\/services\/|SG\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|shpat_|shpss_|shpca_|shppa_|gh[pousr]_[A-Za-z0-9_]+|github_pat_|sk-[a-zA-Z0-9_-]{20,}|sk-ant-|lin_api_|ops?_[a-zA-Z0-9]{26,}|(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysqlx?|mssql|oracle|redis|amqp|elasticsearch):\/\/[^\s]+@/;

export const createSecurityTaskRunner = (
  numOfTasks: number,
  deps = { initTaskRunner },
): TaskRunner<SecurityCheckTask, SuspiciousFileResult | null> => {
  return deps.initTaskRunner<SecurityCheckTask, SuspiciousFileResult | null>({
    numOfTasks,
    workerType: 'securityCheck',
    runtime: 'worker_threads',
  });
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps: {
    initTaskRunner?: typeof initTaskRunner;
    taskRunner?: TaskRunner<SecurityCheckTask, SuspiciousFileResult | null>;
  } = {},
): Promise<SuspiciousFileResult[]> => {
  const gitDiffTasks: SecurityCheckTask[] = [];
  const gitLogTasks: SecurityCheckTask[] = [];

  // Git diff/log tasks always go to workers (no pre-filter) because they are small
  // and missing a secret in a diff/log would be a security gap.
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

  // Pre-filter file tasks: only send files whose content matches trigger patterns
  // to the worker pool. ~99% of source files don't contain secret-like patterns,
  // so this avoids the IPC overhead of sending them to worker threads.
  const candidateFiles = rawFiles.filter((file) => SECRET_TRIGGER_PATTERN.test(file.content));
  const skippedCount = rawFiles.length - candidateFiles.length;
  if (skippedCount > 0) {
    logger.trace(`Security pre-filter: skipped ${skippedCount}/${rawFiles.length} files (no trigger patterns)`);
  }

  const ownTaskRunner = !deps.taskRunner;
  const createRunner = deps.initTaskRunner ?? initTaskRunner;
  const taskRunner =
    deps.taskRunner ??
    createRunner<SecurityCheckTask, SuspiciousFileResult | null>({
      numOfTasks: candidateFiles.length + gitDiffTasks.length + gitLogTasks.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
  const fileTasks = candidateFiles.map(
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
    logger.trace(
      `Starting security check for ${tasks.length} tasks (${candidateFiles.length} files + ${gitDiffTasks.length + gitLogTasks.length} git)`,
    );
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
    // Only cleanup worker pool if we created it (not pre-created)
    if (ownTaskRunner) {
      await taskRunner.cleanup();
    }
  }
};
