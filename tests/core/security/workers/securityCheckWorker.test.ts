// `rules` is exported at runtime, but its TS type pulls in `@secretlint/secretlint-rule-aws`
// which is a transitive dev-only dep not installed here. Cast through `unknown` keeps
// the rule-count pin without depending on the missing types package.
const presetModule = (await import('@secretlint/secretlint-rule-preset-recommend')) as unknown as {
  rules: { meta: { id: string } }[];
};
const recommendedPresetRules = presetModule.rules;

import type { SecretLintCoreConfig } from '@secretlint/types';
import { describe, expect, test } from 'vitest';
import {
  createSecretLintConfig,
  QUICK_SECRET_SCREEN,
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

  // Pins the QUICK_SECRET_SCREEN early-return path. Plain source code carries
  // no marker for any recommended-preset rule, so the pre-screen must reject
  // it; pair the regex check with runSecretLint to confirm the early return
  // still produces a null result on rejected content.
  test('QUICK_SECRET_SCREEN rejects plain source and runSecretLint short-circuits', async () => {
    const plainContent = 'function greet(name) { return name; }\nconst x = 42;\n';
    expect(QUICK_SECRET_SCREEN.test(plainContent)).toBe(false);
    const result = await runSecretLint('plain.ts', plainContent, 'file', config);
    expect(result).toBeNull();
  });

  // Spot-check that the marker for each detection rule is present in the
  // pre-screen; a missing marker would cause silent secret bypass. Fixtures
  // carry only the marker substring (not a credible token shape) so they do
  // not look like real credentials to scanners. The block is also wrapped
  // in secretlint-disable to silence the lint pass that would otherwise
  // flag the marker prefixes themselves.
  test('QUICK_SECRET_SCREEN matches the marker for every detection rule', () => {
    // secretlint-disable
    const samples: Record<string, string> = {
      aws_access_key_AKIA: 'AKIA placeholder marker',
      aws_access_key_A3T: 'A3TX placeholder marker',
      aws_secret_key: 'secret_access_key placeholder marker',
      aws_account: 'aws_account placeholder marker',
      privatekey_pem: '-----BEGIN placeholder marker',
      slack_token: 'xoxb-placeholder',
      slack_webhook: 'hooks.slack.com placeholder marker',
      github_classic: 'ghp_placeholder',
      github_finegrained: 'github_pat_placeholder',
      anthropic: 'sk-ant-api0 placeholder marker',
      openai_typed: 'sk-proj-placeholder',
      openai_bare: 'T3BlbkFJ placeholder marker',
      linear: 'lin_api_placeholder',
      onepassword: 'ops_ey placeholder marker',
      sendgrid: 'SG.placeholder.x',
      shopify: 'shpat_placeholder',
      npm_xoauth: 'x-oauth-basic placeholder marker',
      npm_authtoken: '_authToken placeholder marker',
      npm_classic: 'npm_PlaceholderMarkerPadding00',
      mongodb: 'mongodb://placeholder',
      mongodb_srv: 'mongodb+srv://placeholder',
      mysql: 'mysql://placeholder',
      mysql_jdbc: 'jdbc:mysql://placeholder',
      postgres: 'postgresql://placeholder',
      basicauth: '://placeholderuser:placeholderpass@example.com',
    };
    // secretlint-enable
    for (const [name, content] of Object.entries(samples)) {
      expect(QUICK_SECRET_SCREEN.test(content), `marker missing for ${name}`).toBe(true);
    }
  });

  // Maintenance pin: the QUICK_SECRET_SCREEN regex carries one marker per
  // detection rule in the recommended preset. When secretlint adds a new
  // rule in a minor bump, this assertion fails and forces an audit of the
  // pre-screen before the new rule's secrets can silently slip through.
  test('QUICK_SECRET_SCREEN covers every detection rule in the installed preset', () => {
    const detectionRuleIds = recommendedPresetRules
      .map((r) => r.meta.id)
      .filter((id) => id !== '@secretlint/secretlint-rule-filter-comments');
    expect(detectionRuleIds.sort()).toEqual(
      [
        '@secretlint/secretlint-rule-1password',
        '@secretlint/secretlint-rule-anthropic',
        '@secretlint/secretlint-rule-aws',
        '@secretlint/secretlint-rule-basicauth',
        '@secretlint/secretlint-rule-database-connection-string',
        '@secretlint/secretlint-rule-gcp',
        '@secretlint/secretlint-rule-github',
        '@secretlint/secretlint-rule-linear',
        '@secretlint/secretlint-rule-npm',
        '@secretlint/secretlint-rule-openai',
        '@secretlint/secretlint-rule-privatekey',
        '@secretlint/secretlint-rule-sendgrid',
        '@secretlint/secretlint-rule-shopify',
        '@secretlint/secretlint-rule-slack',
      ].sort(),
    );
  });
});
