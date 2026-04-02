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
 * Trigger substrings for SecretLint rule pre-filtering.
 *
 * Every rule in @secretlint/secretlint-rule-preset-recommend requires at least
 * one of these substrings to be present in the content for a match to occur.
 * Files whose content contains NONE of these strings are guaranteed clean and
 * can safely skip the expensive SecretLint regex battery.
 *
 * This eliminates ~95% of files from full scanning in typical codebases,
 * cutting security check wall time by 50%+.
 */
const SECURITY_TRIGGER_STRINGS: readonly string[] = [
  // Private keys (@secretlint/secretlint-rule-privatekey, GCP JSON format)
  'PRIVATE KEY',
  '-----BEGIN',
  'private_key',

  // AWS (@secretlint/secretlint-rule-aws)
  // Access key prefixes: AKIA (long-term), ASIA (STS), AGPA/AIDA/AROA/AIPA/ANPA/ANVA (role/policy)
  'AKIA',
  'ASIA',
  'AGPA',
  'AIDA',
  'AROA',
  'AIPA',
  'ANPA',
  'ANVA',
  'A3T',
  'SECRET_ACCESS_KEY',
  'secret_access_key',
  'SecretAccessKey',

  // GitHub (@secretlint/secretlint-rule-github)
  'ghp_',
  'gho_',
  'ghu_',
  'ghs_',
  'ghr_',
  'github_pat_',

  // Slack (@secretlint/secretlint-rule-slack)
  'hooks.slack.com',
  'xoxb-',
  'xoxp-',
  'xoxa-',
  'xoxo-',
  'xoxr-',
  'xapp-',

  // npm (@secretlint/secretlint-rule-npm)
  'npm_',
  '_authToken',

  // Database connection strings (@secretlint/secretlint-rule-database-connection-string)
  'mysql://',
  'mysqlx://',
  'postgres://',
  'postgresql://',
  'mongodb://',
  'mongodb+srv://',

  // Anthropic (@secretlint/secretlint-rule-anthropic)
  'sk-ant-api0',

  // OpenAI (@secretlint/secretlint-rule-openai)
  'sk-proj-',
  'sk-svcacct-',
  'sk-admin-',
  'T3BlbkFJ',

  // Shopify (@secretlint/secretlint-rule-shopify)
  'shppa_',
  'shpca_',
  'shpat_',
  'shpss_',

  // SendGrid (@secretlint/secretlint-rule-sendgrid)
  'SG.',

  // Linear (@secretlint/secretlint-rule-linear)
  'lin_api_',

  // 1Password (@secretlint/secretlint-rule-1password)
  'ops_',

  // Basic auth header (@secretlint/secretlint-rule-basicauth)
  'Basic ',
  'basic ',
];

/**
 * Fast pre-filter: check if content contains any substring that could trigger
 * a SecretLint rule. Uses native V8 string indexOf which is extremely fast
 * (~0.5ms for 1000 files / 4MB total). Files that pass this check are guaranteed
 * to not contain any detectable secrets.
 */
export const contentMayContainSecrets = (content: string): boolean => {
  for (const trigger of SECURITY_TRIGGER_STRINGS) {
    if (content.indexOf(trigger) !== -1) {
      return true;
    }
  }

  // BasicAuth URL credentials: ://user:pass@host requires "@" within ~515 chars
  // after "://". Checking both separately is too broad (50%+ of files contain "://").
  // The proximity check narrows matches to actual URL-embedded credential patterns
  // while still guaranteeing no false negatives (user+":"+pass = max 513 chars).
  if (contentHasUrlWithAt(content)) {
    return true;
  }

  return false;
};

/**
 * Check if content contains a "://...@" pattern (URL with potential embedded credentials).
 * Scans for every occurrence of "://" and checks if "@" appears within the next 515 chars
 * (max username 256 + ":" + max password 256 + "@" = 515 per the BasicAuth rule).
 */
const MAX_CRED_LENGTH = 515;

const contentHasUrlWithAt = (content: string): boolean => {
  let searchFrom = 0;
  while (true) {
    const idx = content.indexOf('://', searchFrom);
    if (idx === -1) return false;
    const atIdx = content.indexOf('@', idx + 3);
    if (atIdx === -1) return false; // No "@" anywhere after this point
    if (atIdx - idx <= MAX_CRED_LENGTH) return true;
    searchFrom = idx + 3;
  }
};

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

  // Pre-filter files: only send files to SecretLint workers whose content
  // contains at least one trigger substring that could match a SecretLint rule.
  // This eliminates ~95% of files from full scanning, reducing both worker CPU
  // time (regex matching) and IPC overhead (content serialization).
  const fileTasks: SecurityCheckTask[] = [];
  let skippedByPreFilter = 0;

  for (const file of rawFiles) {
    if (contentMayContainSecrets(file.content)) {
      fileTasks.push({
        filePath: file.path,
        content: file.content,
        type: 'file',
      });
    } else {
      skippedByPreFilter++;
    }
  }

  logger.trace(`Security pre-filter: ${skippedByPreFilter}/${rawFiles.length} files skipped (no trigger strings)`);

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
