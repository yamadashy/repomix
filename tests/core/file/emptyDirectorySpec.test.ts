import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig, writeFixture } from '../../testing/testUtils.js';

// Behavior-level regression tests for empty-directory preservation.
//
// Empty directories are an opt-in feature (`output.includeEmptyDirectories`).
// The implementation takes a 2-pass globby path (object mode, then a
// `findEmptyDirectories` filter) which is more complex than the default
// onlyFiles path and therefore a tempting target for perf reshuffling.
//
// This spec is intentionally single-root only — multi-root empty-directory
// handling is explicitly NOT implemented (see comment in
// generateMultiRootSections in fileTreeGenerate.ts: "Empty directories
// (emptyDirPaths) are not included in multi-root output"). Asserting on it
// would freeze the current intentional gap as a contract.

describe('empty directory preservation spec', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTempDir('repomix-emptydir-spec-');
  });

  it('returns an empty directory in emptyDirPaths when `includeEmptyDirectories: true`', async () => {
    await writeFixture(tmpDir, {
      'src/keep.ts': 'export {};\n',
    });
    await fs.mkdir(path.join(tmpDir, 'docs', 'placeholder'), { recursive: true });

    const config = createMockConfig({ output: { includeEmptyDirectories: true } });
    const { filePaths, emptyDirPaths } = await searchFiles(tmpDir, config);

    expect(filePaths).toContain('src/keep.ts');
    expect(emptyDirPaths).toContain('docs/placeholder');
  });

  it('omits empty directories entirely when `includeEmptyDirectories: false` (the default)', async () => {
    // Negative contract: the default behavior must not start eagerly emitting
    // empty directories as a side effect of a perf change (e.g. one that
    // unifies the two-pass globby into a single pass and forgets to gate the
    // emptyDir collection).
    await writeFixture(tmpDir, {
      'src/keep.ts': 'export {};\n',
    });
    await fs.mkdir(path.join(tmpDir, 'docs', 'placeholder'), { recursive: true });

    const config = createMockConfig();
    const { filePaths, emptyDirPaths } = await searchFiles(tmpDir, config);

    expect(filePaths).toContain('src/keep.ts');
    expect(emptyDirPaths).toEqual([]);
  });

  it('does not report a directory that contains files as empty', async () => {
    // Sanity check on the filter logic: if `findEmptyDirectories` were replaced
    // by a faster but coarser implementation that only checked the directory
    // listing without descending, a directory containing nested files could be
    // wrongly classified as empty.
    await writeFixture(tmpDir, {
      'pkg/util/util.ts': 'export {};\n',
    });
    // pkg has a non-empty subdir, so neither `pkg` nor `pkg/util` should be reported.

    const config = createMockConfig({ output: { includeEmptyDirectories: true } });
    const { emptyDirPaths } = await searchFiles(tmpDir, config);

    expect(emptyDirPaths).not.toContain('pkg');
    expect(emptyDirPaths).not.toContain('pkg/util');
  });

  it('respects gitignore: an empty directory whose path is gitignored is NOT reported', async () => {
    // Empty-dir collection must compose with the ignore engine. If a perf
    // change collected empty dirs from the raw fs walk and bypassed gitignore,
    // an `output/` directory listed in .gitignore would still be emitted.
    await writeFixture(tmpDir, {
      '.gitignore': 'output/\n',
      'src/keep.ts': 'export {};\n',
    });
    await fs.mkdir(path.join(tmpDir, 'output'), { recursive: true });

    const config = createMockConfig({ output: { includeEmptyDirectories: true } });
    const { emptyDirPaths } = await searchFiles(tmpDir, config);

    expect(emptyDirPaths).not.toContain('output');
  });
});
