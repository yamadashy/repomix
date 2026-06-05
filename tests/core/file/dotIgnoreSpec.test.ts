import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Behavior-level regression tests for repomix-specific ignore files.
//
// The gitignore spec (fileSearch.gitignoreSpec.test.ts) covers the .gitignore
// path. This file covers the *sibling* ignore mechanisms a perf-tuning agent
// is equally likely to touch when reshaping the search pipeline:
//
//   .repomixignore — always honored regardless of toggles
//   .ignore       — honored only when `useDotIgnore: true` (the default)
//
// Fixtures use file extensions outside the project's defaultIgnoreList so any
// filtering observed must originate from the user-provided ignore file under
// test rather than from baseline defaults.

describe('repomix dot-ignore spec', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-dotignore-spec-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('honors top-level .repomixignore patterns', async () => {
    await writeFixture(tmpDir, {
      '.repomixignore': '*.secret\nsubdir/private.data\n',
      'keep.ts': 'export {};\n',
      'oops.secret': 'should be ignored\n',
      'subdir/private.data': 'should be ignored\n',
      'subdir/public.ts': 'export {};\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('keep.ts');
    expect(filePaths).toContain('subdir/public.ts');
    expect(filePaths).not.toContain('oops.secret');
    expect(filePaths).not.toContain('subdir/private.data');
  });

  it('honors a nested .repomixignore inside a subdirectory', async () => {
    // The repomixignore engine must descend into the tree, not just look at
    // the root. A perf optimization that only reads root-level ignore files
    // would break this contract.
    await writeFixture(tmpDir, {
      'pkg/.repomixignore': 'generated/\n',
      'pkg/src.ts': 'export {};\n',
      'pkg/generated/bundle.data': '// generated\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig());

    expect(filePaths).toContain('pkg/src.ts');
    expect(filePaths).not.toContain('pkg/generated/bundle.data');
  });

  it.each([
    { fileName: '.ignore', ignorePattern: '**/.ignore' },
    { fileName: '.repomixignore', ignorePattern: '**/.repomixignore' },
  ])('still applies nested $fileName rules when the file itself is ignored', async ({ fileName, ignorePattern }) => {
    await writeFixture(tmpDir, {
      [`pkg/${fileName}`]: 'generated.data\n',
      'pkg/src.ts': 'export {};\n',
      'pkg/generated.data': 'generated\n',
    });

    const { filePaths } = await searchFiles(
      tmpDir,
      createMockConfig({
        include: ['pkg/**'],
        ignore: {
          useDefaultPatterns: false,
          customPatterns: [ignorePattern],
        },
      }),
    );

    expect(filePaths).toContain('pkg/src.ts');
    expect(filePaths).not.toContain(`pkg/${fileName}`);
    expect(filePaths).not.toContain('pkg/generated.data');
  });

  it('honors .ignore files when `useDotIgnore` is on (the default)', async () => {
    await writeFixture(tmpDir, {
      '.ignore': '*.draft\n',
      'keep.ts': 'export {};\n',
      'noisy.draft': 'noise\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { useDotIgnore: true } }));

    expect(filePaths).toContain('keep.ts');
    expect(filePaths).not.toContain('noisy.draft');
  });

  it('ignores .ignore files when `useDotIgnore` is explicitly off', async () => {
    // Inverse contract: a perf change that starts honoring .ignore
    // unconditionally — e.g. by pre-collecting all dot-prefixed ignore files
    // at the top of the pipeline — would surface here.
    await writeFixture(tmpDir, {
      '.ignore': '*.draft\n',
      'keep.ts': 'export {};\n',
      'noisy.draft': 'noise\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { useDotIgnore: false } }));

    expect(filePaths).toContain('keep.ts');
    // With useDotIgnore disabled, the .draft file should NOT be filtered by
    // the .ignore file. It must reach the search output.
    expect(filePaths).toContain('noisy.draft');
  });

  it('always honors .repomixignore even when `useDotIgnore` is off', async () => {
    // `useDotIgnore` is specifically for the generic `.ignore` file. The
    // repomix-native `.repomixignore` is independently respected — a perf
    // refactor that conflates the two toggles would break this.
    await writeFixture(tmpDir, {
      '.repomixignore': '*.draft\n',
      'keep.ts': 'export {};\n',
      'noisy.draft': 'noise\n',
    });

    const { filePaths } = await searchFiles(tmpDir, createMockConfig({ ignore: { useDotIgnore: false } }));

    expect(filePaths).toContain('keep.ts');
    expect(filePaths).not.toContain('noisy.draft');
  });
});
