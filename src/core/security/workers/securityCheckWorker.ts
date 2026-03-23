import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, repomixLogLevels, setLogLevelByWorkerData } from '../../../shared/logger.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

// Cache log level check to avoid per-task overhead (trace logs use DEBUG level)
const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;

// Security check type to distinguish between regular files, git diffs, and git logs
export type SecurityCheckType = 'file' | 'gitDiff' | 'gitLog';

export interface SecurityCheckTask {
  filePath: string;
  content: string;
  type: SecurityCheckType;
}

// Batched task: multiple files in a single worker message to reduce structured clone overhead
export interface SecurityCheckBatchTask {
  batch: SecurityCheckTask[];
}

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

// Cache config at module level — it's identical for every file
let cachedConfig: SecretLintCoreConfig | undefined;

export default async (task: SecurityCheckTask | SecurityCheckBatchTask) => {
  if (!cachedConfig) {
    cachedConfig = createSecretLintConfig();
  }
  const config = cachedConfig;

  // Batch mode: process multiple files in one worker call
  if ('batch' in task) {
    const results: (SuspiciousFileResult | null)[] = [];
    for (const item of task.batch) {
      try {
        results.push(await runSecretLint(item.filePath, item.content, item.type, config));
      } catch (error) {
        logger.error(`Error checking security on ${item.filePath}:`, error);
        throw error;
      }
    }
    return results;
  }

  // Single task mode (backwards compatible)
  try {
    const processStartAt = isTracing ? process.hrtime.bigint() : 0n;
    const secretLintResult = await runSecretLint(task.filePath, task.content, task.type, config);

    if (isTracing) {
      const processEndAt = process.hrtime.bigint();
      logger.trace(
        `Checked security on ${task.filePath}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
      );
    }

    return secretLintResult;
  } catch (error) {
    logger.error(`Error checking security on ${task.filePath}:`, error);
    throw error;
  }
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

export const createSecretLintConfig = (): SecretLintCoreConfig => ({
  rules: [
    {
      id: '@secretlint/secretlint-rule-preset-recommend',
      rule: creator,
    },
  ],
});

// Export cleanup function for Tinypool teardown (no cleanup needed for this worker)
export const onWorkerTermination = async (): Promise<void> => {
  // No cleanup needed for security check worker
};
