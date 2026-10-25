import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Ignore patterns of the form `**/name*` (a wildcard in the last segment) used to
// be rewritten to `**/name*/**`, which only matches directory contents, so files
// such as `npm-debug.log.1` or `repomix-output.xml` were packed despite the
// built-in rules. These cases pin both halves of the fix: matching files are now
// excluded, and directory contents excluded before stay excluded.

describe('trailing wildcard ignore patterns', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-trailing-wildcard-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('excludes files matched by built-in rules ending in a wildcard', async () => {
    await writeFixture(tmpDir, {
      'keep.ts': 'export {};\n',
      'npm-debug.log.1': 'log\n',
      'yarn-error.log.old': 'log\n',
      'repomix-output.1.xml': 'previous output\n',
      'docs/repomix-output.xml': 'previous output\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toEqual(['keep.ts']);
  });

  it('excludes both dotfiles and dot-directory contents for **/.*', async () => {
    await writeFixture(tmpDir, {
      'keep.ts': 'export {};\n',
      '.env.example': 'KEY=value\n',
      'sub/.hidden/secret.txt': 'secret\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { customPatterns: ['**/.*'] } }));

    expect(filePaths).toEqual(['keep.ts']);
  });

  it('still loads .repomixignore rules when **/.* also matches the ignore file', async () => {
    await writeFixture(tmpDir, {
      'keep.ts': 'export {};\n',
      '.repomixignore': 'secrets.json\n',
      'secrets.json': '{}\n',
      'sub/.repomixignore': 'private.txt\n',
      'sub/private.txt': 'private\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { customPatterns: ['**/.*'] } }));

    expect(filePaths).toEqual(['keep.ts']);
  });

  it('still excludes the contents of directories matched by a trailing wildcard', async () => {
    await writeFixture(tmpDir, {
      'keep.ts': 'export {};\n',
      'cache-v1/data.bin.txt': 'cached\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { customPatterns: ['**/cache-*'] } }));

    expect(filePaths).toEqual(['keep.ts']);
  });
});
