import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Behavior-level tests for `.git/info/exclude`.
//
// The docs promise this file is honored the way git honors it, so these assert
// against git's matching rules rather than against glob semantics: an
// unanchored pattern (no slash) matches at any depth, while a pattern
// containing a slash stays anchored to the root.
//
// As in the .gitignore spec, fixture names deliberately avoid the project's
// `defaultIgnoreList`, so any filtering observed must come from the exclude
// file rather than from baseline defaults.

describe('fileSearch .git/info/exclude spec', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-git-exclude-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('applies a slash-less pattern at every depth, as git does', async () => {
    await writeFixture(tmpDir, {
      '.git/info/exclude': 'secret.txt\n',
      'secret.txt': 'root\n',
      'sub/secret.txt': 'nested\n',
      'keep.txt': 'keep\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('keep.txt');
    expect(filePaths).not.toContain('secret.txt');
    expect(filePaths).not.toContain('sub/secret.txt');
  });

  it('keeps a pattern containing a slash anchored to the root', async () => {
    await writeFixture(tmpDir, {
      '.git/info/exclude': 'build/output.txt\n',
      'build/output.txt': 'root build\n',
      'sub/build/output.txt': 'nested build\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).not.toContain('build/output.txt');
    expect(filePaths).toContain('sub/build/output.txt');
  });

  it('applies a slash-less directory pattern at every depth', async () => {
    await writeFixture(tmpDir, {
      '.git/info/exclude': 'scratch/\n',
      'scratch/note.txt': 'root scratch\n',
      'sub/scratch/note.txt': 'nested scratch\n',
      'keep.txt': 'keep\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('keep.txt');
    expect(filePaths).not.toContain('scratch/note.txt');
    expect(filePaths).not.toContain('sub/scratch/note.txt');
  });

  it('leaves a leading-slash pattern anchored to the root', async () => {
    await writeFixture(tmpDir, {
      '.git/info/exclude': '/secret.txt\n',
      'secret.txt': 'root\n',
      'sub/secret.txt': 'nested\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).not.toContain('secret.txt');
    expect(filePaths).toContain('sub/secret.txt');
  });

  it('ignores the exclude file when useGitignore is off', async () => {
    await writeFixture(tmpDir, {
      '.git/info/exclude': 'secret.txt\n',
      'secret.txt': 'root\n',
      'sub/secret.txt': 'nested\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({ ignore: { useGitignore: false, useDefaultPatterns: true, customPatterns: [] } }),
    );

    expect(filePaths).toContain('secret.txt');
    expect(filePaths).toContain('sub/secret.txt');
  });
});
