import type { SecretLintCoreConfig } from '@secretlint/types';
import { describe, expect, test } from 'vitest';
import securityCheckWorker, {
  createSecretLintConfig,
  mightContainSecret,
  runSecretLint,
} from '../../../../src/core/security/workers/securityCheckWorker.js';

describe('securityCheck', () => {
  const config: SecretLintCoreConfig = createSecretLintConfig();

  test('should detect sensitive information', async () => {
    // Sensitive content with secrets from https://secretlint.github.io/
    // secretlint-disable
    const sensitiveContent = `
# Secretlint Demo

URL: https://user:pass@example.com

GitHub Token: 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

SendGrid: "SG.APhb3zgjtx3hajdas1TjBB.H7Sgbba3afgKSDyB442aDK0kpGO3SD332313-L5528Kewhere"

AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY

Slack:
xoxa-23984754863-2348975623103
xoxb-23984754863-2348975623103
xoxo-23984754863-2348975623103

Private Key:

-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQCYdGaf5uYMsilGHfnx/zxXtihdGFr3hCWwebHGhgEAVn0xlsTd
1QwoKi+rpI1O6hzyVOuoQtboODsONGRlHbNl6yJ936Yhmr8PiNwpA5qIxZAdmFv2
tqEllWr0dGPPm3B/2NbjuMpSiJNAcBQa46X++doG5yNMY8NCgTsjBZIBKwIDAQAB
AoGAN+Pkg5aIm/rsurHeoeMqYhV7srVtE/S0RIA4tkkGMPOELhvRzGmAbXEZzNkk
nNujBQww4JywYK3MqKZ4b8F1tMG3infs1w8V7INAYY/c8HzfrT3f+MVxijoKV2Fl
JlUXCclztoZhxAxhCR+WC1Upe1wIrWNwad+JA0Vws/mwrEECQQDxiT/Q0lK+gYaa
+riFeZmOaqwhlFlYNSK2hCnLz0vbnvnZE5ITQoV+yiy2+BhpMktNFsYNCfb0pdKN
D87x+jr7AkEAoZWITvqErh1RbMCXd26QXZEfZyrvVZMpYf8BmWFaBXIbrVGme0/Q
d7amI6B8Vrowyt+qgcUk7rYYaA39jYB7kQJAdaX2sY5gw25v1Dlfe5Q5WYdYBJsv
0alAGUrS2PVF69nJtRS1SDBUuedcVFsP+N2IlCoNmfhKk+vZXOBgWrkZ1QJAGJlE
FAntUvhhofW72VG6ppPmPPV7VALARQvmOWxpoPSbJAqPFqyy5tamejv/UdCshuX/
9huGINUV6BlhJT6PEQJAF/aqQTwZqJdwwJqYEQArSmyOW7UDAlQMmKMofjBbeBvd
H4PSJT5bvaEhxRj7QCwonoX4ZpV0beTnzloS55Z65g==
-----END RSA PRIVATE KEY-----
    `;
    // secretlint-enable

    const secretLintResult = await runSecretLint('test.md', sensitiveContent, 'file', config);
    expect(secretLintResult).not.toBeNull();
  });

  test('should not detect sensitive information in normal content', async () => {
    const normalContent = `
# Normal Content

This is a regular markdown file with no sensitive information.

Here's some code:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

And here's a list:

1. Item 1
2. Item 2
3. Item 3

That's all!
    `;

    const secretLintResult = await runSecretLint('normal.md', normalContent, 'file', config);
    expect(secretLintResult).toBeNull();
  });
});

describe('securityCheck pre-filter (mightContainSecret)', () => {
  const config: SecretLintCoreConfig = createSecretLintConfig();

  // Strong drift guard: realistic secrets that the LIVE secretlint engine
  // actually flags. For each, the engine must report a finding AND the
  // pre-filter must mark it for scanning. If a future @secretlint/* bump changes
  // a rule's prefix/shape so the engine still detects a secret the pre-filter no
  // longer matches, the corresponding case fails loudly. This explicitly covers
  // the token kinds whose prefixes were once missing from the pattern
  // (Stripe rk_test_, Slack xapp-/xoxo-, GitHub ghr_, npm _authToken).
  // secretlint-disable
  const liveDetectableSecrets: [name: string, filePath: string, content: string][] = [
    ['GitHub classic token (ghp_)', 'a.txt', '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'],
    ['GitHub refresh token (ghr_)', 'a.txt', `ghr_${'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'}`],
    ['GitLab PAT (glpat-)', 'a.txt', 'glpat-ABCDEFGHIJ1234567890'],
    ['Slack bot token (xoxb-)', 'a.txt', 'xoxb-23984754863-2348975623103'],
    ['Slack app token (xapp-)', 'a.txt', 'xapp-1-A1B2C3D4E5-1234567890123-abcdefghijklmnopqrstuvwxyz123456'],
    ['Slack token (xoxo-)', 'a.txt', 'xoxo-1234567890-1234567890-abcdefghijklmnopqrstuvwx'],
    ['Shopify token (shppa_)', 'a.txt', `shppa_${'0123456789abcdef0123456789abcdef'}`],
    ['Stripe live secret key (sk_live_)', 'a.txt', `sk_live_${'0123456789abcdefABCDEFghij'}`],
    ['Stripe restricted test key (rk_test_)', 'a.txt', `rk_test_${'ABCDEFGHIJKLMNOPQRSTUVWX1234567890'}`],
    ['npm token (npm_)', 'a.txt', `npm_${'abcdefghijklmnopqrstuvwxyz0123456789'}`],
    ['npm .npmrc authToken', '.npmrc', '//registry.npmjs.org/:_authToken=npmRealToken0123456789abcdef'],
    ['Basic-auth URL', 'a.txt', 'https://user:pass@example.com'],
    ['AWS secret access key', 'config.txt', 'AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY'],
  ];
  // secretlint-enable

  test.each(
    liveDetectableSecrets,
  )('%s is detected by the engine and matched by the pre-filter', async (_name, filePath, content) => {
    // The engine fires...
    expect(await runSecretLint(filePath, content, 'file', config)).not.toBeNull();
    // ...so the pre-filter must NOT skip it.
    expect(mightContainSecret(content)).toBe(true);
  });

  // Additional rule families whose real tokens are longer than is convenient to
  // synthesize here (or, for AWS access-key/account-id, are gated off by default
  // via enableIDScanRule). We assert the regex-level necessary literal only —
  // these guard against accidental removal of a prefix from the pattern.
  // secretlint-disable
  const regexOnlyIndicators: [name: string, sample: string][] = [
    ['GitHub fine-grained PAT', 'github_pat_11AAAAA'],
    ['SendGrid key', 'SG.APhb3zgjtx3hajdas1TjBB.H7Sgbba3afgKSD'],
    ['OpenAI project key', 'sk-proj-abcdefghijklmnop'],
    ['Anthropic key', 'sk-ant-api03-abcdef'],
    ['Groq key', 'gsk_abcdefghijklmnop'],
    ['HuggingFace token', 'hf_abcdefghijklmnopqrstuvwxyz'],
    ['Docker PAT', 'dckr_pat_abcdefghijklmnop'],
    ['Notion token', 'ntn_abcdefghijklmnop'],
    ['Vault token', 'hvs.abcdefghijklmnop'],
    ['GCP service account JSON', '"private_key_id": "abcdef0123456789"'],
    ['Private key (PEM)', '-----BEGIN RSA PRIVATE KEY-----'],
    ['Database connection URL', 'postgres://user:pass@localhost:5432/db'],
  ];
  // secretlint-enable

  test.each(regexOnlyIndicators)('flags %s indicators for scanning', (_name, sample) => {
    expect(mightContainSecret(sample)).toBe(true);
  });

  test('does not flag benign content', () => {
    const benign = `# Title\n\nfunction greet(name) { return "hi " + name; }\n\nconst items = [1, 2, 3];\n`;
    expect(mightContainSecret(benign)).toBe(false);
  });

  // The core invariant: the worker's pre-filtered scan must produce exactly the
  // same per-item results as scanning every item through the live secretlint
  // engine without the pre-filter.
  test('pre-filtered worker results match an unfiltered scan of the same items', async () => {
    // secretlint-disable
    const secretContent = `URL: https://user:pass@example.com
GitHub Token: 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`;
    // An AWS secret key whose only pre-filter indicator is the word "secret":
    // if "secret" were dropped from the pattern this item would be skipped and
    // the invariant below would fail (engine still reports it).
    const awsSecretContent = 'AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY';
    // A git diff carrying a real token: file-type items without an indicator are
    // skipped, but gitDiff items must always reach the engine.
    const diffContent = '+const token = "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";';
    // secretlint-enable
    const benignContent = `# Docs\n\nJust an ordinary file with code: const sum = (a, b) => a + b;\n`;
    const items = [
      { filePath: 'secret.md', content: secretContent, type: 'file' as const },
      { filePath: 'clean.ts', content: benignContent, type: 'file' as const },
      // A clean file that nonetheless contains a generic indicator word, so it is
      // still scanned by the pre-filter and must come back null from the engine.
      { filePath: 'notes.md', content: 'See the account dashboard for details.', type: 'file' as const },
      { filePath: 'config.txt', content: awsSecretContent, type: 'file' as const },
      { filePath: 'change.diff', content: diffContent, type: 'gitDiff' as const },
    ];

    const filtered = await securityCheckWorker({ items });
    const unfiltered = await Promise.all(items.map((i) => runSecretLint(i.filePath, i.content, i.type, config)));

    expect(filtered).toEqual(unfiltered);
    // Sanity: secret-bearing items are detected, clean files are not.
    expect(filtered[0]).not.toBeNull();
    expect(filtered[1]).toBeNull();
    expect(filtered[2]).toBeNull();
    expect(filtered[3]).not.toBeNull(); // AWS secret key
    expect(filtered[4]).not.toBeNull(); // gitDiff reaches the engine
  });
});
