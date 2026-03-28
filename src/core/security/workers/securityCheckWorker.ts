import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
await setLogLevelByWorkerData();

// Security check type to distinguish between regular files, git diffs, and git logs
export type SecurityCheckType = 'file' | 'gitDiff' | 'gitLog';

export interface SecurityCheckTask {
  filePath: string;
  content: string;
  type: SecurityCheckType;
}

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

// Accept a batch of tasks and return an array of results.
// Batching reduces IPC overhead by amortizing structured clone costs across
// multiple files per worker round-trip (~20 files/batch vs 1 file/task).
export default async (tasks: SecurityCheckTask[]): Promise<(SuspiciousFileResult | null)[]> => {
  const config = getCachedConfig();
  const results: (SuspiciousFileResult | null)[] = [];
  const isTracing = logger.isTraceEnabled();

  for (const { filePath, content, type } of tasks) {
    try {
      let secretLintResult: SuspiciousFileResult | null;
      if (isTracing) {
        const processStartAt = process.hrtime.bigint();
        secretLintResult = await runSecretLint(filePath, content, type, config);
        const processEndAt = process.hrtime.bigint();
        logger.trace(
          `Checked security on ${filePath}. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
        );
      } else {
        secretLintResult = await runSecretLint(filePath, content, type, config);
      }
      results.push(secretLintResult);
    } catch (error) {
      logger.error(`Error checking security on ${filePath}:`, error);
      throw error;
    }
  }

  return results;
};

// O(1) extension extraction using lastIndexOf instead of split('.').pop()
// which allocates an intermediate array for every file
const getFileExtension = (filePath: string): string => {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot > -1 ? filePath.slice(lastDot + 1) : '';
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
      ext: getFileExtension(filePath),
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

// Cache secretlint config at module level — config is stateless and identical for every task
let cachedConfig: SecretLintCoreConfig | null = null;
const getCachedConfig = (): SecretLintCoreConfig => {
  if (!cachedConfig) {
    cachedConfig = createSecretLintConfig();
  }
  return cachedConfig;
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
