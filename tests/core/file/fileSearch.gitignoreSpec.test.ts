import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Behavior-level regression tests for gitignore handling.
//
// These tests run against a real temp directory (no module mocks) so they
// assert the contract `searchFiles` exposes to users — which files end up in
// the pack, given a particular tree of .gitignore files. Any optimization that
// swaps out the underlying ignore-file engine must keep these passing.
//
// The auto-perf-tuning agent has historically proposed prescan replacements
// that silently broke gitignore semantics (negation, slash-less recursion,
// parent .gitignore, dot-dir traversal, monorepo packages/). These cases all
// originate from that incident — they are the spec, not coincidental coverage.
//
// Note on fixture choices: every filename and extension below intentionally
// avoids the project's `defaultIgnoreList` so that any filtering observed must
// originate from the user-provided .gitignore, not from baseline defaults.
// Picking patterns like `*.log` or `dist/` would produce false positives
// because those are filtered regardless of gitignore behavior.

describe('fileSearch gitignore spec', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-gitignore-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Mirrors git's own negation semantics: a file may be re-included if its
  // ancestor directories are not themselves excluded. (Git docs:
  // "It is not possible to re-include a file if a parent directory of that
  // file is excluded.") A prescan implementation that drops `!` lines wholesale
  // — as a previous auto-perf-tuning iteration did — would fail this case.
  it('honors negation patterns: `!keep.draft` re-includes a file that a broader rule would otherwise ignore', async () => {
    await writeFixture(tmpDir, {
      '.gitignore': '*.draft\n!keep.draft\n',
      'src/index.ts': 'export {};\n',
      'noisy.draft': 'noisy\n',
      'keep.draft': 'this one matters\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('src/index.ts');
    expect(filePaths).toContain('keep.draft');
    expect(filePaths).not.toContain('noisy.draft');
  });

  it.each([
    'browser/.gitignore',
    '**/.gitignore',
    // A trailing slash must behave identically: the pattern is still deferred so
    // globby loads the rules, and the post-filter (sharing the same normalization)
    // still removes the file rather than leaking it.
    '**/.gitignore/',
  ])('still applies nested .gitignore rules when the nested .gitignore file itself is ignored by `%s`', async (ignorePattern) => {
    await writeFixture(tmpDir, {
      'browser/.gitignore': '*.draft\n',
      'browser/src/index.ts': 'export {};\n',
      'browser/noisy.draft': 'noisy\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({
        include: ['browser/**'],
        ignore: {
          useDefaultPatterns: false,
          customPatterns: [ignorePattern],
        },
      }),
    );

    expect(filePaths).toContain('browser/src/index.ts');
    expect(filePaths).not.toContain('browser/.gitignore');
    expect(filePaths).not.toContain('browser/noisy.draft');
  });

  it('filters root and nested .gitignore files matched by `**/.gitignore` while still applying their rules', async () => {
    await writeFixture(tmpDir, {
      '.gitignore': 'root-noisy.draft\n',
      'keep.ts': 'export {};\n',
      'root-noisy.draft': 'noisy\n',
      'src/.gitignore': 'generated.ts\n',
      'src/keep.ts': 'export {};\n',
      'src/generated.ts': 'generated\n',
    });
    await fs.mkdir(path.join(tmpDir, 'empty'), { recursive: true });

    const { filePaths, emptyDirPaths } = await searchFiles(
      tmpDir,
      createMockConfig({
        output: { includeEmptyDirectories: true },
        ignore: {
          useDefaultPatterns: false,
          customPatterns: ['**/.gitignore'],
        },
      }),
    );

    expect(filePaths).toContain('keep.ts');
    expect(filePaths).toContain('src/keep.ts');
    expect(filePaths).not.toContain('.gitignore');
    expect(filePaths).not.toContain('src/.gitignore');
    expect(filePaths).not.toContain('root-noisy.draft');
    expect(filePaths).not.toContain('src/generated.ts');
    expect(emptyDirPaths).toContain('empty');
  });

  it('excludes the contents of a directory literally named `.gitignore` when ignored by `**/.gitignore`', async () => {
    // Pathological but valid: `.gitignore` as a directory name. The old globby
    // behavior (where `**/.gitignore` normalized to `**/.gitignore/**`) excluded
    // its contents, so the post-filter must drop descendants too, not just a
    // file named `.gitignore`.
    await writeFixture(tmpDir, {
      'proj/.gitignore/inside.txt': 'x\n',
      'proj/keep.txt': 'x\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({
        include: ['proj/**'],
        ignore: {
          useDefaultPatterns: false,
          customPatterns: ['**/.gitignore'],
        },
      }),
    );

    expect(filePaths).toContain('proj/keep.txt');
    expect(filePaths).not.toContain('proj/.gitignore/inside.txt');
  });

  it('applies slash-less patterns recursively to all subdirectories', async () => {
    await writeFixture(tmpDir, {
      '.gitignore': '*.draft\nsecret.data\n',
      'a.draft': 'top\n',
      'secret.data': 'top\n',
      'keep.ts': 'export {};\n',
      'sub/nested/b.draft': 'nested\n',
      'sub/secret.data': 'nested\n',
      'sub/keep.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    // Slash-less gitignore entries must match at every depth, matching git's
    // own behavior. A prescan that flattens entries to `${relPath}/${pattern}`
    // would break this.
    expect(filePaths).not.toContain('a.draft');
    expect(filePaths).not.toContain('secret.data');
    expect(filePaths).not.toContain('sub/nested/b.draft');
    expect(filePaths).not.toContain('sub/secret.data');
    expect(filePaths).toContain('keep.ts');
    expect(filePaths).toContain('sub/keep.ts');
  });

  // Note: parent-directory .gitignore handling when `searchFiles` is invoked
  // against a subdirectory is intentionally NOT covered here. globby reads
  // .gitignore files within `cwd` only, so this is a pre-existing gap on main
  // rather than a regression target. Capture it as a real spec the day the
  // codebase commits to that behavior.

  it('reads .gitignore inside monorepo `packages/*` (the classic Lerna/pnpm layout)', async () => {
    await writeFixture(tmpDir, {
      'package.json': '{"name":"root","private":true}\n',
      'packages/ui/.gitignore': 'generated/\n',
      'packages/ui/src.ts': 'export {};\n',
      'packages/ui/generated/bundle.data': '// generated\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('packages/ui/src.ts');
    expect(filePaths).not.toContain('packages/ui/generated/bundle.data');
  });

  it('reads .gitignore inside dot-prefixed directories like `.config/`', async () => {
    await writeFixture(tmpDir, {
      '.config/.gitignore': 'secret.data\n',
      '.config/public.data': '{"ok":true}\n',
      '.config/secret.data': '{"shh":true}\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('.config/public.data');
    expect(filePaths).not.toContain('.config/secret.data');
  });
});
