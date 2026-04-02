import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

// Security check type to distinguish between regular files, git diffs, and git logs
export type SecurityCheckType = 'file' | 'gitDiff' | 'gitLog';

export interface SecurityCheckTask {
  filePath: string;
  content: string;
  type: SecurityCheckType;
}

export interface SecurityCheckBatchTask {
  batch: SecurityCheckTask[];
}

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

export interface SecurityCheckBatchResult {
  results: (SuspiciousFileResult | null)[];
}

export const createSecretLintConfig = (): SecretLintCoreConfig => ({
  rules: [
    {
      id: '@secretlint/secretlint-rule-preset-recommend',
      rule: creator,
    },
  ],
});

// Cache config at module level - created once per worker, reused for all tasks
const cachedConfig = createSecretLintConfig();

const runSingleTask = async (task: SecurityCheckTask): Promise<SuspiciousFileResult | null> => {
  const config = cachedConfig;

  try {
    const processStartAt = process.hrtime.bigint();
    const secretLintResult = await runSecretLint(task.filePath, task.content, task.type, config);
    const processEndAt = process.hrtime.bigint();

    logger.trace(
      `Checked security on ${task.filePath}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
    );

    return secretLintResult;
  } catch (error) {
    logger.error(`Error checking security on ${task.filePath}:`, error);
    throw error;
  }
};

const runBatchTask = async (task: SecurityCheckBatchTask): Promise<SecurityCheckBatchResult> => {
  const processStartAt = process.hrtime.bigint();

  const results: (SuspiciousFileResult | null)[] = [];
  for (const item of task.batch) {
    results.push(await runSingleTask(item));
  }

  logger.trace(
    `Batch checked ${task.batch.length} files. Took: ${(Number(process.hrtime.bigint() - processStartAt) / 1e6).toFixed(2)}ms`,
  );
  return { results };
};

export default async (
  task: SecurityCheckTask | SecurityCheckBatchTask,
): Promise<SuspiciousFileResult | null | SecurityCheckBatchResult> => {
  if ('batch' in task) {
    return runBatchTask(task);
  }
  return runSingleTask(task);
};

export const runSecretLint = async (
  filePath: string,
  content: string,
  type: SecurityCheckType,
  config: SecretLintCoreConfig,
): Promise<SuspiciousFileResult | null> => {
  const result = await lintSource({
    source: {
      filePath: filePath,
      content: content,
      ext: filePath.split('.').pop() || '',
      contentType: 'text',
    },
    options: {
      config: config,
    },
  });

  if (result.messages.length > 0) {
    const issueCount = result.messages.length;
    const issueText = issueCount === 1 ? 'security issue' : 'security issues';
    logger.trace(`Found ${issueCount} ${issueText} in ${filePath}`);
    // Do not log the actual messages to prevent leaking sensitive information

    return {
      filePath,
      messages: result.messages.map((message) => message.message),
      type,
    };
  }

  return null;
};

// Export cleanup function for Tinypool teardown (no cleanup needed for this worker)
export const onWorkerTermination = async (): Promise<void> => {
  // No cleanup needed for security check worker
};
