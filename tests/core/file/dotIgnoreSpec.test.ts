import { beforeEach, describe, expect, it } from 'vitest';
import { mergeConfigs } from '../../../src/config/configLoad.js';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createTempDir } from '../../testing/tempDir.js';
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
    tmpDir = await createTempDir('repomix-dotignore-spec-');
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

  // #959: ignore files must keep applying when customPatterns is also set.
  describe('together with customPatterns', () => {
    const noBaseline = { useGitignore: false, useDefaultPatterns: false };

    it('applies .ignore and customPatterns from a config file', async () => {
      await writeFixture(tmpDir, {
        '.ignore': 'spec/data/\n',
        'bin/test.sh': 'bin\n',
        'spec/data/test.txt': 'data\n',
        'src/main.js': 'main\n',
      });

      // Go through the config merge, as a repomix.config.json with customPatterns would
      const merged = mergeConfigs(tmpDir, { ignore: { customPatterns: ['bin/'] } }, {});
      const { filePaths } = await searchFiles(tmpDir, { ...merged, ignore: { ...merged.ignore, ...noBaseline } });

      expect(filePaths).toContain('src/main.js');
      expect(filePaths).not.toContain('bin/test.sh');
      expect(filePaths).not.toContain('spec/data/test.txt');
    });

    it('applies .ignore, .repomixignore and customPatterns together', async () => {
      await writeFixture(tmpDir, {
        '.ignore': 'dist/\n',
        '.repomixignore': 'tmp/\n',
        'dist/bundle.js': 'dist\n',
        'tmp/cache.dat': 'tmp\n',
        'vendor/lib.js': 'vendor\n',
        'src/index.js': 'src\n',
      });

      const { filePaths } = await searchFiles(
        tmpDir,
        createMockConfig({ ignore: { ...noBaseline, useDotIgnore: true, customPatterns: ['vendor/'] } }),
      );

      expect(filePaths).toContain('src/index.js');
      expect(filePaths).not.toContain('dist/bundle.js');
      expect(filePaths).not.toContain('tmp/cache.dat');
      expect(filePaths).not.toContain('vendor/lib.js');
    });

    it('applies a nested .ignore with customPatterns', async () => {
      await writeFixture(tmpDir, {
        'src/.ignore': 'generated/\n',
        'src/app.js': 'app\n',
        'src/generated/output.js': 'generated\n',
        'bin/run.sh': 'bin\n',
      });

      const { filePaths } = await searchFiles(
        tmpDir,
        createMockConfig({ ignore: { ...noBaseline, useDotIgnore: true, customPatterns: ['bin/'] } }),
      );

      expect(filePaths).toContain('src/app.js');
      expect(filePaths).not.toContain('bin/run.sh');
      expect(filePaths).not.toContain('src/generated/output.js');
    });
  });
});
