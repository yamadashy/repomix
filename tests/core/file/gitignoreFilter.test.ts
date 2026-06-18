import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { buildIgnoreFileFilter } from '../../../src/core/file/gitignoreFilter.js';

const IGNORE_FILE_PATTERNS = ['**/.repomixignore', '**/.ignore'];

describe('buildIgnoreFileFilter', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-gif-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const write = async (relativePath: string, content: string) => {
    const fullPath = path.join(tempDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  };

  test('returns a no-op filter when there is nothing to discover', async () => {
    const filter = await buildIgnoreFileFilter(tempDir, false, [], [], undefined);
    expect(filter.isIgnored('anything.txt', false)).toBe(false);
    expect(filter.patternsForFastGlob).toEqual([]);
  });

  test('applies root and nested .gitignore rules with correct anchoring', async () => {
    await write('.gitignore', '*.log\n');
    await write('sub/.gitignore', 'local.txt\n');
    await write('sub/local.txt', 'x');

    const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
    expect(filter.isIgnored('a.log', false)).toBe(true);
    expect(filter.isIgnored('sub/deep/b.log', false)).toBe(true);
    expect(filter.isIgnored('sub/local.txt', false)).toBe(true);
    // The nested rule must not leak to siblings of `sub`.
    expect(filter.isIgnored('other/local.txt', false)).toBe(false);
  });

  test('honors negation patterns and disables fast-glob pruning when they exist', async () => {
    await write('.gitignore', '*.tmp\n!keep.tmp\n');

    const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
    expect(filter.isIgnored('a.tmp', false)).toBe(true);
    expect(filter.isIgnored('keep.tmp', false)).toBe(false);
    expect(filter.patternsForFastGlob).toEqual([]);
  });

  test('tests directories against trailing-slash rules', async () => {
    await write('.gitignore', 'build/\n');
    await write('build/out.txt', 'x');

    const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
    expect(filter.isIgnored('build', true)).toBe(true);
    expect(filter.isIgnored('build/out.txt', false)).toBe(true);
    // A file named like the directory rule is not matched by `build/`.
    expect(filter.isIgnored('build', false)).toBe(false);
  });

  test('derives fast-glob pruning patterns when no negations are present', async () => {
    await write('.gitignore', 'big/\n*.tmp\n');

    const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
    expect(filter.patternsForFastGlob).toEqual(['**/big/**', '*.tmp']);
  });

  test('reads .repomixignore and .ignore files', async () => {
    await write('.repomixignore', 'rmx/\n');
    await write('.ignore', 'dotted.txt\n');

    const filter = await buildIgnoreFileFilter(tempDir, false, IGNORE_FILE_PATTERNS, [], undefined);
    expect(filter.isIgnored('rmx', true)).toBe(true);
    expect(filter.isIgnored('dotted.txt', false)).toBe(true);
    // Pruning patterns are derived even when gitignore is disabled.
    // (sorted: discovery order between files in the same directory is not guaranteed)
    expect([...filter.patternsForFastGlob].sort()).toEqual(['**/rmx/**', 'dotted.txt']);
  });

  test('skips .gitignore files when useGitignore is false', async () => {
    await write('.gitignore', '*.log\n');

    const filter = await buildIgnoreFileFilter(tempDir, false, IGNORE_FILE_PATTERNS, [], undefined);
    expect(filter.isIgnored('a.log', false)).toBe(false);
  });

  test('does not descend into directories matched by the caller ignore patterns', async () => {
    await write('excluded/.gitignore', 'hidden.txt\n');

    const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, ['excluded/**'], undefined);
    // The .gitignore inside the excluded directory is never discovered.
    expect(filter.isIgnored('excluded/hidden.txt', false)).toBe(false);
  });

  describe('inputs routed to legacy path resolution (never produced by fast-glob)', () => {
    test('normalizes dot segments, doubled and trailing slashes before matching', async () => {
      await write('.gitignore', '*.log\nbuild/\n');

      const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
      // The `ignore` package throws on `./`-prefixed paths, and `..` segments
      // must resolve before matching — these would crash or mismatch on the
      // fast path. Doubled/trailing slashes are routed too so they keep the
      // legacy normalize-equivalent semantics.
      expect(filter.isIgnored('./a.log', false)).toBe(true);
      expect(filter.isIgnored('sub/../a.log', false)).toBe(true);
      expect(filter.isIgnored('sub//deep/a.log', false)).toBe(true);
      expect(filter.isIgnored('build/', true)).toBe(true);
      // Negative control through the same fallback branch.
      expect(filter.isIgnored('./a.txt', false)).toBe(false);
    });

    test('never ignores the scan root itself or paths outside the base directory', async () => {
      await write('.gitignore', '*\n');

      const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
      expect(filter.isIgnored('', false)).toBe(false);
      expect(filter.isIgnored('.', true)).toBe(false);
      expect(filter.isIgnored('../outside.txt', false)).toBe(false);
    });

    test('resolves absolute inputs against the base directory', async () => {
      await write('.gitignore', '*.log\n');

      const filter = await buildIgnoreFileFilter(tempDir, true, IGNORE_FILE_PATTERNS, [], undefined);
      expect(filter.isIgnored(path.join(tempDir, 'a.log'), false)).toBe(true);
      expect(filter.isIgnored(path.join(tempDir, 'a.txt'), false)).toBe(false);
    });
  });

  describe('with a git root above the scan root', () => {
    test('collects parent .gitignore files and anchors them at the git root', async () => {
      await fs.mkdir(path.join(tempDir, '.git'), { recursive: true });
      await write('.gitignore', '*.secret\n/rootonly.txt\n');
      await write('pkg/app/src/main.txt', 'x');

      const scanRoot = path.join(tempDir, 'pkg', 'app');
      const filter = await buildIgnoreFileFilter(scanRoot, true, IGNORE_FILE_PATTERNS, [], undefined);

      // Bare-name parent rule applies inside the subdirectory.
      expect(filter.isIgnored('x.secret', false)).toBe(true);
      // Root-anchored parent rule does not apply to same-named files in the subdirectory.
      expect(filter.isIgnored('rootonly.txt', false)).toBe(false);
      // Pruning is disabled because patterns are anchored to the git root, not the scan root.
      expect(filter.patternsForFastGlob).toEqual([]);
    });

    test('lets a nested negation override a parent rule', async () => {
      await fs.mkdir(path.join(tempDir, '.git'), { recursive: true });
      await write('.gitignore', 'shared.txt\n');
      await write('pkg/.gitignore', '!shared.txt\n');

      const scanRoot = path.join(tempDir, 'pkg');
      const filter = await buildIgnoreFileFilter(scanRoot, true, IGNORE_FILE_PATTERNS, [], undefined);
      expect(filter.isIgnored('shared.txt', false)).toBe(false);
    });

    test('treats a .git file (worktree reference) as a git root marker', async () => {
      await write('.git', 'gitdir: /elsewhere/.git/worktrees/x\n');
      await write('.gitignore', '*.secret\n');
      await fs.mkdir(path.join(tempDir, 'sub'), { recursive: true });

      const scanRoot = path.join(tempDir, 'sub');
      const filter = await buildIgnoreFileFilter(scanRoot, true, IGNORE_FILE_PATTERNS, [], undefined);
      expect(filter.isIgnored('a.secret', false)).toBe(true);
    });
  });
});
