import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';
import { mightContainSecret, type SecurityCheckTask, type SecurityCheckType } from '../securityPreFilter.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
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

export default async (task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
  const config = cachedConfig;
  const processStartAt = process.hrtime.bigint();

  try {
    const results: (SuspiciousFileResult | null)[] = [];
    for (const item of task.items) {
      results.push(await runSecretLint(item.filePath, item.content, item.type, config));
    }

    const processEndAt = process.hrtime.bigint();
    logger.trace(
      `Checked security on ${task.items.length} items. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
    );

    return results;
  } catch (error) {
    logger.error('Error in security check worker:', error);
    throw error;
  }
};

export const runSecretLint = async (
  filePath: string,
  content: string,
  type: SecurityCheckType,
  config: SecretLintCoreConfig,
): Promise<SuspiciousFileResult | null> => {
  // Fast path: skip expensive lintSource() if content has no security-relevant keywords.
  // This avoids creating ~15 rule instances, StructuredSource index scan, and regex matching
  // for files that clearly don't contain secrets (typically 95-99% of files in a repo).
  if (!mightContainSecret(content)) {
    return null;
  }

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
