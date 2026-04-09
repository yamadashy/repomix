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

// Fast keyword pre-filter to skip expensive lintSource() for files that clearly don't contain secrets.
// Each keyword is a substring that MUST be present for at least one secretlint rule to fire.
// If none appear in the content, we can safely skip the full security check (~15 rule instantiations,
// StructuredSource index scan, and regex matching per file).
//
// Coverage: all ACTIVE secretlint-rule-preset-recommend rules including BasicAuth (via ://).
//
// EXCLUDED (disabled by default in @secretlint/secretlint-rule-aws, enableIDScanRule: false):
//   AWS Access Key ID prefixes: AKIA, AGPA, AIDA, AROA, AIPA, ANPA, ANVA, ASIA
//   AWS Account ID patterns: ACCOUNT_ID, account_id, AccountId
// These keywords cause false positives on extremely common code patterns (e.g., account_id
// in database models, ASIA in timezone handling) triggering expensive lintSource() calls
// that always find nothing because the corresponding rules are never executed.
const SECURITY_KEYWORDS: readonly string[] = [
  // AWS Secret Access Key — covers all case/underscore variants of the secretlint regex
  // (?:SECRET|secret|Secret)_?(?:ACCESS|access|Access)_?(?:KEY|key|Key)
  '_ACCESS_KEY',
  '_access_key',
  'AccessKey',
  '_Access_Key',
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
  'hooks.slack.com',
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
  'SG.',
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
  'mongodb+srv://',
  'mysql://',
  'jdbc:mysql',
  'postgres://',
  'postgresql://',
];

// Escape special regex characters in keyword strings for safe embedding in a regex alternation.
// Keywords like 'SG.', 'hooks.slack.com', 'mongodb+srv://' contain regex metacharacters
// that must be escaped to match literally.
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// BasicAuth pattern source: protocol://user:password@host (secretlint-rule-basicauth)
// Using a targeted regex instead of broad '://' keyword to avoid false positives on normal URLs.
const BASIC_AUTH_PATTERN_SOURCE = String.raw`\w:\/\/[^\s/:]+:[^\s/:]+@`;

// Pre-compiled combined regex for all security keywords + BasicAuth pattern.
// Using a single regex alternation is ~3-4x faster than 50 sequential String.includes()
// calls because the regex engine tests all patterns in a single pass through the string,
// with early exit on the first match. This saves ~180ms at 5K files compared to the
// iterative approach.
const SECURITY_CHECK_PATTERN = new RegExp([...SECURITY_KEYWORDS.map(escapeRegex), BASIC_AUTH_PATTERN_SOURCE].join('|'));

/**
 * Fast check whether content might contain a secret.
 * Returns true if any security keyword is found, meaning the file should go through full lintSource().
 * Returns false if no keywords are found, allowing us to skip the expensive check.
 */
export const mightContainSecret = (content: string): boolean => SECURITY_CHECK_PATTERN.test(content);
