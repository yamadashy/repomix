import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
const serverJson = require('../../server.json');

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Collects the CLI flags declared with commander in cliRun.ts, e.g. `--mcp` from
 * `.option('--mcp', ...)` and both `-w` and `--watch` from `.option('-w, --watch', ...)`.
 */
const getDeclaredCliFlags = (): Set<string> => {
  const source = readFileSync(path.join(repoRoot, 'src/cli/cliRun.ts'), 'utf8');
  const flags = new Set<string>();
  for (const match of source.matchAll(/\.option\(\s*'([^']+)'/g)) {
    for (const part of match[1].split(',')) {
      // Drop the value placeholder, e.g. `--sandbox [dir]` -> `--sandbox`
      const flag = part.trim().split(/[\s<[]/)[0];
      if (flag.startsWith('-')) {
        flags.add(flag);
      }
    }
  }
  return flags;
};

// The MCP Registry verifies npm package ownership by reading `mcpName` from the
// published package.json and comparing it to the `name` in server.json. That
// check only runs at publish time, after the npm version is already published
// and therefore immutable, so a mismatch is caught here instead.
describe('server.json (MCP Registry metadata)', () => {
  test('mcpName in package.json matches the server.json name', () => {
    expect(packageJson.mcpName).toBe(serverJson.name);
  });

  test('the server name uses the GitHub namespace required by the publish workflow', () => {
    // `mcp-publisher login github-oidc` can only publish under io.github.<owner>/.
    expect(serverJson.name).toMatch(/^io\.github\.[^/]+\/[^/]+$/);
  });

  test('the npm package identifier matches the published package name', () => {
    const npmPackage = serverJson.packages.find((pkg: { registryType: string }) => pkg.registryType === 'npm');
    expect(npmPackage).toBeDefined();
    expect(npmPackage.identifier).toBe(packageJson.name);
  });

  test('the description stays within the registry limit of 100 characters', () => {
    expect(serverJson.description.length).toBeLessThanOrEqual(100);
  });

  // packageArguments is the one part of server.json that has to agree with the
  // CLI rather than with package.json. If the flag were renamed, every
  // registry-based install would launch repomix without MCP mode.
  test('every packaged argument is a flag the CLI actually declares', () => {
    const npmPackage = serverJson.packages.find((pkg: { registryType: string }) => pkg.registryType === 'npm');
    const declaredFlags = getDeclaredCliFlags();
    const packagedFlags = npmPackage.packageArguments.map((arg: { value: string }) => arg.value);

    expect(packagedFlags).toContain('--mcp');
    for (const flag of packagedFlags) {
      expect(declaredFlags).toContain(flag);
    }
  });
});
