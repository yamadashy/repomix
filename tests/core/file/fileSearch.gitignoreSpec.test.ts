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

  // Parent-directory .gitignore handling: when `searchFiles` is invoked against a
  // subdirectory of a git repo, globby's `gitignore: true` walks up to the git root
  // and applies every parent `.gitignore`. The default-scan fast path only sees
  // entries under rootDir, so it deliberately bows out (falls back to globby) when a
  // git root is a proper ancestor of rootDir; this spec guards that the parent rules
  // are still honored. The `.git` directory marks the repo root for the git-root walk.
  it('applies a parent .gitignore when scanning a subdirectory of a git repo', async () => {
    await writeFixture(tmpDir, {
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.gitignore': '*.secret\n',
      'sub/keep.ts': 'export {};\n',
      'sub/leak.secret': 'excluded by the parent .gitignore at the repo root\n',
    });

    const { filePaths } = await searchFiles(path.join(tmpDir, 'sub'), createMockConfig());

    expect(filePaths).toContain('keep.ts');
    expect(filePaths).not.toContain('leak.secret');
  });

  // Fast-path coverage: a `.git` directory at rootDir makes rootDir the repo root, so
  // the default `['**/*']` scan takes the single-traversal fast path. With
  // `useGitignore` disabled the fast path must NOT register `.gitignore` matchers, so
  // the `.gitignore` rule is inert and the matching file is kept.
  it('ignores .gitignore on the fast path when useGitignore is disabled', async () => {
    await writeFixture(tmpDir, {
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.gitignore': '*.draft\n',
      'noisy.draft': 'kept because gitignore is disabled\n',
      'keep.ts': 'export {};\n',
    });

    const config = createMockConfig({
      ignore: { useGitignore: false, useDefaultPatterns: true, customPatterns: [] },
    });
    const { filePaths } = await searchFiles(tmpDir, config);

    expect(filePaths).toContain('noisy.draft');
    expect(filePaths).toContain('keep.ts');
  });

  // Companion to the above: with `useGitignore` enabled on the same fast path, the
  // `.gitignore` rule (including a negation) is applied exactly as git would.
  it('honors .gitignore and negation on the fast path when useGitignore is enabled', async () => {
    await writeFixture(tmpDir, {
      '.git/HEAD': 'ref: refs/heads/main\n',
      '.gitignore': '*.draft\n!keep.draft\n',
      'noisy.draft': 'dropped\n',
      'keep.draft': 'kept via negation\n',
      'src/app.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('keep.draft');
    expect(filePaths).toContain('src/app.ts');
    expect(filePaths).not.toContain('noisy.draft');
  });

  // Trailing-slash directory ignores (`artifacts/`) force globby's
  // post-traversal predicate to stat each discovered entry to confirm it is a
  // directory before applying the directory-form rule. `searchFiles` serves
  // that per-entry stat synchronously (via a node:fs adapter whose
  // `promises.stat` delegates to `statSync`) to avoid the libuv thread-pool
  // round-trip; this case guards that the directory-check still produces
  // identical filtering. The `!keep.draft` negation keeps globby on the
  // predicate path (where the directory stat happens) rather than letting it
  // hand the patterns to fast-glob's native ignore.
  it('excludes contents of a trailing-slash directory ignore while honoring a sibling negation', async () => {
    await writeFixture(tmpDir, {
      '.gitignore': 'artifacts/\n*.draft\n!keep.draft\n',
      'artifacts/out.data': 'generated\n',
      'artifacts/nested/deep.data': 'generated\n',
      'src/app.ts': 'export {};\n',
      'keep.draft': 'kept\n',
      'noisy.draft': 'dropped\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).not.toContain('artifacts/out.data');
    expect(filePaths).not.toContain('artifacts/nested/deep.data');
    expect(filePaths).toContain('src/app.ts');
    expect(filePaths).toContain('keep.draft');
    expect(filePaths).not.toContain('noisy.draft');
  });

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
