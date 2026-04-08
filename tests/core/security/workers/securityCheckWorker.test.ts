import type { SecretLintCoreConfig } from '@secretlint/types';
import { describe, expect, test } from 'vitest';
import { mightContainSecret } from '../../../../src/core/security/securityPreFilter.js';
import { createSecretLintConfig, runSecretLint } from '../../../../src/core/security/workers/securityCheckWorker.js';

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

  test('should detect sensitive information even when pre-filter matches on a single keyword', async () => {
    // Content with ONLY an AWS secret access key pattern (no other secret types)
    // secretlint-disable
    const awsOnlyContent = `AWS_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYSECRETSKEY`;
    // secretlint-enable

    const secretLintResult = await runSecretLint('aws-config.env', awsOnlyContent, 'file', config);
    expect(secretLintResult).not.toBeNull();
    expect(secretLintResult?.messages.length).toBeGreaterThan(0);
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

describe('mightContainSecret', () => {
  test('should return false for normal content without any secret keywords', () => {
    const content = `
      function greet(name) {
        console.log("Hello, " + name);
      }
      export default greet;
    `;
    expect(mightContainSecret(content)).toBe(false);
  });

  test('should return true for content with AWS Access Key ID prefix', () => {
    expect(mightContainSecret('my key is AKIAIOSFODNN7EXAMPLE')).toBe(true);
  });

  test('should return true for content with GitHub token prefix', () => {
    // secretlint-disable
    expect(mightContainSecret('token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    // secretlint-enable
  });

  test('should return true for content with private key header', () => {
    expect(mightContainSecret('-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
  });

  test('should return true for content with Slack token', () => {
    // secretlint-disable
    expect(mightContainSecret('SLACK_TOKEN=xoxb-123456789-123456789-abc')).toBe(true);
    // secretlint-enable
  });

  test('should return true for content with database connection string', () => {
    expect(mightContainSecret('DATABASE_URL=mongodb://user:pass@host:27017/db')).toBe(true);
  });

  test('should return true for content with BasicAuth URL', () => {
    // secretlint-disable
    expect(mightContainSecret('URL: https://user:pass@example.com')).toBe(true);
    // secretlint-enable
  });

  test('should return true for content with SendGrid key', () => {
    expect(mightContainSecret('SENDGRID_API_KEY=SG.xxxxx.xxxxx')).toBe(true);
  });

  test('should return true for content with AWS Secret Access Key context', () => {
    expect(mightContainSecret('AWS_SECRET_ACCESS_KEY=some_key_value')).toBe(true);
  });

  test('should return true for content with NPM token', () => {
    expect(mightContainSecret('//registry.npmjs.org/:_authToken=token')).toBe(true);
  });

  test('should return true for content with Anthropic key prefix', () => {
    expect(mightContainSecret('ANTHROPIC_API_KEY=sk-ant-api03-xxx')).toBe(true);
  });

  test('should return true for content with OpenAI key prefix', () => {
    expect(mightContainSecret('OPENAI_API_KEY=sk-proj-xxx')).toBe(true);
  });

  test('should return true for content with Shopify token prefix', () => {
    expect(mightContainSecret('SHOPIFY_TOKEN=shpat_xxxxxxxxxxxx')).toBe(true);
  });
});
