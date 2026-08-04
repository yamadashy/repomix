import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { globby } from 'globby';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Regression tests for #1765: repos in the wild carry junk backslash lines in
// their .gitignore (e.g. `\.\NUL` in microsoft/data-formulator, `\*.pid.lock`
// elsewhere). Per the gitignore spec a backslash only escapes the next
// character, so these lines are valid-but-odd patterns — they must never crash
// the pack. The reported crash ("path should be a `path.relative()`d string")
// comes out of the ignore package's path validation and reproduces on Windows
// only, which is why these tests matter most on the windows-latest CI leg.

describe('fileSearch gitignore backslash patterns (#1765)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-gitignore-backslash-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('survives a root .gitignore containing `\\.\\NUL` and still applies the other rules', async () => {
    await writeFixture(tmpDir, {
      '.gitignore': '\\.\\NUL\n*.draft\n',
      'keep.ts': 'export {};\n',
      'noisy.draft': 'noisy\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('keep.ts');
    expect(filePaths).not.toContain('noisy.draft');
  });

  it('survives a nested .gitignore containing `\\*.pid.lock`', async () => {
    await writeFixture(tmpDir, {
      'packages/app/.gitignore': '\\*.pid.lock\n*.draft\n',
      'packages/app/keep.ts': 'export {};\n',
      'packages/app/noisy.draft': 'noisy\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('packages/app/keep.ts');
    expect(filePaths).not.toContain('packages/app/noisy.draft');
  });

  // Diagnostic: hit globby directly, without repomix's error wrapping, so a CI
  // failure prints the original stack trace and pinpoints where inside
  // globby/ignore the backslash pattern is rejected. Expected to fail on
  // Windows until the fix lands; will be folded into the tests above then.
  it('diagnostic: raw globby with gitignore:true tolerates `\\.\\NUL`', async () => {
    await writeFixture(tmpDir, {
      '.gitignore': '\\.\\NUL\n',
      'keep.ts': 'export {};\n',
    });

    const filePaths = await globby(['**/*'], {
      cwd: tmpDir,
      gitignore: true,
      dot: true,
      onlyFiles: true,
    });

    expect(filePaths).toContain('keep.ts');
  });
});
