import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';
import { getVersion } from '../../../src/core/file/packageJsonParse.js';

const require = createRequire(import.meta.url);
const actualPackageJson = require('../../../package.json') as { version: string };

describe('packageJsonParse', () => {
  test('getVersion should return the version from package.json', async () => {
    const version = await getVersion();

    expect(version).toBe(actualPackageJson.version);
    // Version should be a valid semver-like string
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('getVersion should return a string', async () => {
    const version = await getVersion();

    expect(typeof version).toBe('string');
    expect(version).not.toBe('unknown');
  });
});
