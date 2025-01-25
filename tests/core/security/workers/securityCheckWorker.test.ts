import type { SecretLintCoreConfig } from '@secretlint/types';
import { describe, expect, test } from 'vitest';
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

    const secretLintResult = await runSecretLint('test.md', sensitiveContent, config);
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

    const secretLintResult = await runSecretLint('normal.md', normalContent, config);
    expect(secretLintResult).toBeNull();
  });
});
