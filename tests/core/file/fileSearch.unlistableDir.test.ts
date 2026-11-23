import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, isWindows } from '../../testing/testUtils.js';

// A directory with execute but no read permission cannot be listed, yet files inside it can be
// opened by name, so a static --include pattern or a --stdin path still reaches them. Git reads
// the directory's .gitignore by name too (`git check-ignore d/secret.txt` reports it), so its
// rules must still apply. Before the fix the ignore file filter treated the failed listing as
// "no ignore files here" and packed the ignored file.
// chmod has no effect on Windows, and root can list any directory.
const canTestPermissions = !isWindows && process.getuid?.() !== 0;

describe.runIf(canTestPermissions)('searchFiles in a directory that cannot be listed', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-unlistable-dir-')));
    await fs.mkdir(path.join(tempDir, '.git'));
    await fs.mkdir(path.join(tempDir, 'd'));
    await fs.writeFile(path.join(tempDir, 'd', '.gitignore'), 'secret.txt\n');
    await fs.writeFile(path.join(tempDir, 'd', '.ignore'), 'local.txt\n');
    await fs.writeFile(path.join(tempDir, 'd', 'secret.txt'), 'secret');
    await fs.writeFile(path.join(tempDir, 'd', 'local.txt'), 'local');
    await fs.writeFile(path.join(tempDir, 'd', 'keep.txt'), 'keep');
    await fs.chmod(path.join(tempDir, 'd'), 0o311);
  });

  afterEach(async () => {
    await fs.chmod(path.join(tempDir, 'd'), 0o755);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('applies the ignore files of the directory to static include patterns', async () => {
    const config = createMockConfig({
      include: ['d/secret.txt', 'd/local.txt', 'd/keep.txt'],
      ignore: { useGitignore: true, useDotIgnore: true, useDefaultPatterns: false, customPatterns: [] },
    });

    const result = await searchFiles(tempDir, config);

    expect(result.filePaths).toEqual(['d/keep.txt']);
  });

  test('applies the ignore files of the directory to explicit (--stdin) files', async () => {
    const config = createMockConfig({
      ignore: { useGitignore: true, useDotIgnore: true, useDefaultPatterns: false, customPatterns: [] },
    });

    const result = await searchFiles(tempDir, config, [
      path.join(tempDir, 'd', 'secret.txt'),
      path.join(tempDir, 'd', 'local.txt'),
      path.join(tempDir, 'd', 'keep.txt'),
    ]);

    expect(result.filePaths).toEqual(['d/keep.txt']);
  });

  test('still honours --no-gitignore and --no-dot-ignore', async () => {
    const config = createMockConfig({
      include: ['d/secret.txt', 'd/local.txt', 'd/keep.txt'],
      ignore: { useGitignore: false, useDotIgnore: false, useDefaultPatterns: false, customPatterns: [] },
    });

    const result = await searchFiles(tempDir, config);

    expect(result.filePaths).toEqual(['d/keep.txt', 'd/local.txt', 'd/secret.txt']);
  });
});
