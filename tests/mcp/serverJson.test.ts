import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
const serverJson = require('../../server.json');

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
});
