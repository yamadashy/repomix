import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

// Security check type to distinguish between regular files, git diffs, and git logs
export type SecurityCheckType = 'file' | 'gitDiff' | 'gitLog';

export interface SecurityCheckItem {
  filePath: string;
  content: string;
  type: SecurityCheckType;
}

export interface SecurityCheckTask {
  items: SecurityCheckItem[];
}

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

// Fast keyword pre-filter to skip expensive lintSource() for files that clearly don't contain secrets.
// Each keyword is a substring that MUST be present for at least one secretlint rule to fire.
// If none appear in the content, we can safely skip the full security check (~15 rule instantiations,
// StructuredSource index scan, and regex matching per file).
//
// Coverage: all secretlint-rule-preset-recommend rules including BasicAuth (via ://).
//
// Uses a single pre-compiled regex with alternation instead of sequential String.includes() calls.
// V8's regex engine handles literal alternations efficiently via internal optimizations,
// scanning the content once rather than making 50+ separate passes. This reduces the
// pre-filter cost from O(keywords × content_length) to a single-pass scan, providing
// a ~3.5x speedup on large repos (e.g. 5.5s → 1.5s for 10000 files).
const SECURITY_KEYWORDS_PATTERN = new RegExp(
  [
    // AWS Access Key ID prefixes (secretlint-rule-aws)
    'AKIA',
    'AGPA',
    'AIDA',
    'AROA',
    'AIPA',
    'ANPA',
    'ANVA',
    'ASIA',
    // AWS Secret Access Key — covers all case/underscore variants of the secretlint regex
    '_ACCESS_KEY',
    '_access_key',
    'AccessKey',
    '_Access_Key',
    // AWS Account ID — most common naming patterns (secretlint-rule-aws, disabled by default)
    'ACCOUNT_ID',
    'account_id',
    'AccountId',
    // GCP Service Account JSON (secretlint-rule-gcp)
    'private_key_id',
    // NPM tokens (secretlint-rule-npm)
    '_authToken',
    'npm_',
    // Slack tokens and webhooks (secretlint-rule-slack)
    'xoxb',
    'xoxp',
    'xoxa',
    'xoxo',
    'xoxr',
    'xapp-',
    'hooks\\.slack\\.com',
    // OpenAI API keys (secretlint-rule-openai)
    'sk-proj-',
    'sk-svcacct-',
    'sk-admin-',
    'T3BlbkFJ',
    // Anthropic API keys (secretlint-rule-anthropic)
    'sk-ant-api0',
    // Linear API keys (secretlint-rule-linear)
    'lin_api_',
    // Private keys in PEM format (secretlint-rule-privatekey)
    'PRIVATE KEY',
    // SendGrid API keys (secretlint-rule-sendgrid)
    'SG\\.',
    // Shopify tokens (secretlint-rule-shopify)
    'shppa',
    'shpca',
    'shpat',
    'shpss',
    // GitHub tokens (secretlint-rule-github)
    'ghp_',
    'gho_',
    'ghu_',
    'ghs_',
    'ghr_',
    'github_pat_',
    // 1Password service account tokens (secretlint-rule-1password)
    'ops_ey',
    // Database connection strings (secretlint-rule-database-connection-string)
    'mongodb://',
    'mongodb\\+srv://',
    'mysql://',
    'jdbc:mysql',
    'postgres://',
    'postgresql://',
  ].join('|'),
);

// BasicAuth pattern: protocol://user:password@host (secretlint-rule-basicauth)
// Using a targeted regex instead of broad '://' keyword to avoid false positives on normal URLs.
const BASIC_AUTH_PATTERN = /\w:\/\/[^\s/:]+:[^\s/:]+@/;

/**
 * Fast check whether content might contain a secret.
 * Returns true if any security keyword is found, meaning the file should go through full lintSource().
 * Returns false if no keywords are found, allowing us to skip the expensive check.
 */
export const mightContainSecret = (content: string): boolean =>
  SECURITY_KEYWORDS_PATTERN.test(content) || BASIC_AUTH_PATTERN.test(content);

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
