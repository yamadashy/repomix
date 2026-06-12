import fsCallback from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, isWindows } from '../../testing/testUtils.js';

// Unlike fileSearch.test.ts these tests run globby against a real directory tree,
// covering the fs adapter that answers globby's gitignore stat calls from readdir
// dirent types. Symlink entries themselves are excluded by followSymbolicLinks: false;
// what matters here is that their presence never changes which files are returned.
describe.runIf(!isWindows)('searchFiles on a real filesystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-fs-adapter-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('applies trailing-slash gitignore rules with symlinks present', async () => {
    await fs.mkdir(path.join(tempDir, 'src'));
    await fs.mkdir(path.join(tempDir, 'realdir'));
    await fs.mkdir(path.join(tempDir, 'build'));
    await fs.writeFile(path.join(tempDir, 'src', 'a.txt'), 'a');
    await fs.writeFile(path.join(tempDir, 'realdir', 'b.txt'), 'b');
    await fs.writeFile(path.join(tempDir, 'build', 'c.txt'), 'c');
    await fs.writeFile(path.join(tempDir, '.gitignore'), 'build/\nlinkdir/\n');
    await fs.symlink('realdir', path.join(tempDir, 'linkdir'));
    await fs.symlink(path.join('src', 'a.txt'), path.join(tempDir, 'filelink'));
    await fs.symlink('missing', path.join(tempDir, 'brokenlink'));

    const config = createMockConfig({
      ignore: { useGitignore: true, useDefaultPatterns: false },
    });

    const result = await searchFiles(tempDir, config);

    expect([...result.filePaths].sort()).toEqual(['.gitignore', 'realdir/b.txt', 'src/a.txt']);
  });

  test('respects nested .gitignore directory rules', async () => {
    await fs.mkdir(path.join(tempDir, 'sub', 'ignored-here'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'sub', '.gitignore'), 'ignored-here/\n');
    await fs.writeFile(path.join(tempDir, 'sub', 'ignored-here', 'd.txt'), 'd');
    await fs.writeFile(path.join(tempDir, 'sub', 'keep.txt'), 'k');

    const config = createMockConfig({
      ignore: { useGitignore: true, useDefaultPatterns: false },
    });

    const result = await searchFiles(tempDir, config);

    expect([...result.filePaths].sort()).toEqual(['sub/.gitignore', 'sub/keep.txt']);
  });

  test('reads each directory only once across globby ignore-discovery and main traversals', async () => {
    await fs.mkdir(path.join(tempDir, 'src', 'core'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'docs'));
    await fs.writeFile(path.join(tempDir, '.gitignore'), 'dist/\n');
    await fs.writeFile(path.join(tempDir, 'src', 'a.txt'), 'a');
    await fs.writeFile(path.join(tempDir, 'src', 'core', 'b.txt'), 'b');
    await fs.writeFile(path.join(tempDir, 'docs', 'c.txt'), 'c');

    const config = createMockConfig({
      ignore: { useGitignore: true, useDefaultPatterns: false },
    });

    // globby walks the tree twice per call (ignore-file discovery + main scan).
    // The adapter must serve the second walk's readdir calls from the first
    // walk's results, so no directory is listed by the kernel more than once.
    // Spying on this module's fsCallback intercepts the adapter's calls too:
    // both import the same module-cached 'node:fs' object, and the adapter
    // dereferences fsCallback.readdir at call time.
    const readdirSpy = vi.spyOn(fsCallback, 'readdir');
    const result = await searchFiles(tempDir, config);

    expect([...result.filePaths].sort()).toEqual(['.gitignore', 'docs/c.txt', 'src/a.txt', 'src/core/b.txt']);
    const withFileTypesDirs = readdirSpy.mock.calls
      .filter(
        ([, options]) =>
          typeof options === 'object' &&
          options !== null &&
          (options as { withFileTypes?: boolean }).withFileTypes === true,
      )
      .map(([dirPath]) => String(dirPath));
    expect(withFileTypesDirs.length).toBeGreaterThan(0);
    expect(new Set(withFileTypesDirs).size).toBe(withFileTypesDirs.length);
  });

  test('answers gitignore stat checks from readdir results instead of per-path stat syscalls', async () => {
    const fileCount = 20;
    await fs.mkdir(path.join(tempDir, 'nested'));
    await fs.writeFile(path.join(tempDir, '.gitignore'), 'dist/\n');
    for (let i = 0; i < fileCount; i++) {
      await fs.writeFile(path.join(tempDir, i % 2 === 0 ? `f${i}.txt` : path.join('nested', `f${i}.txt`)), `${i}`);
    }

    const config = createMockConfig({
      ignore: { useGitignore: true, useDefaultPatterns: false },
    });

    // Without the adapter, globby's gitignore filter stats every matched path — via
    // fs.promises.stat when no custom fs is given, or via the adapter's callback-form
    // stat — so total stat calls would scale with the file count.
    const statSpy = vi.spyOn(fsCallback, 'stat');
    const statPromisesSpy = vi.spyOn(fs, 'stat');
    const result = await searchFiles(tempDir, config);

    expect(result.filePaths).toHaveLength(fileCount + 1);
    expect(statSpy.mock.calls.length + statPromisesSpy.mock.calls.length).toBeLessThan(fileCount);
  });
});
