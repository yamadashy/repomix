import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { collectFiles } from '../../../src/core/file/fileCollect.js';
import { readRawFile } from '../../../src/core/file/fileRead.js';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import { produceOutput } from '../../../src/core/packager/produceOutput.js';
import { pack } from '../../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../../src/core/security/validateFileSafety.js';
import { createMockConfig } from '../../testing/testUtils.js';

// End-to-end coverage that output.patterns globs match each file's
// per-root-relative path (the same basis include/ignore use), not the rewritten
// display path. Regression coverage for the per-root-relative matching fix:
//   - Single root: `src/**` drops the src content (baseline, also the case that
//     already worked because the display path equals the per-root path).
//   - Multiple roots: `src/**` must match each root's `src/...` WITHOUT a
//     root-label prefix, even though the display path is e.g. `app/src/index.ts`.
//   - output.filePathStyle: 'cwd-relative': matching must be unaffected by the
//     shifted display path (e.g. `app/src/index.ts`).
//
// Each test drives a real pack() with the real processFiles (which resolves and
// consumes rawFile.level and filters directory-only files) and the real
// produceOutput (which renders the directory tree from the unfiltered search
// list). The directory tree must still list a directory-only file even though
// its content block is dropped.

const buildConfig = (cwd: string, outputPath: string, overrides: Partial<RepomixConfigMerged['output']> = {}) =>
  createMockConfig({
    cwd,
    output: {
      filePath: outputPath,
      style: 'markdown',
      git: { sortByChanges: false },
      patterns: [{ pattern: 'src/**', directoryStructureOnly: true }],
      ...overrides,
    },
  });

// Mirror the production pipeline but stub the file system search/collect inputs'
// heavy neighbours (security scan, metrics, git) — searchFiles, collectFiles,
// processFiles and produceOutput are the REAL implementations so the level is
// resolved, threaded and consumed exactly as in production.
const runPack = (rootDirs: string[], config: RepomixConfigMerged) =>
  pack(rootDirs, config, () => {}, {
    searchFiles,
    sortPaths: (filePaths) => [...filePaths].sort(),
    collectFiles: (filePaths, root, cfg, progressCallback) =>
      collectFiles(filePaths, root, cfg, progressCallback, { readRawFile }),
    // processFiles is intentionally the real default: it resolves/honors
    // rawFile.level and drops directory-only files from the content output.
    validateFileSafety: (rawFiles, progressCallback, cfg, gitDiff, gitLog) =>
      validateFileSafety(rawFiles, progressCallback, cfg, gitDiff, gitLog, {
        runSecurityCheck: async () => [],
        filterOutUntrustedFiles,
      }),
    produceOutput,
    createMetricsTaskRunner: () => ({
      taskRunner: { run: async () => 0, cleanup: async () => {} },
      warmupPromise: Promise.resolve(),
    }),
    calculateMetrics: async (processedFiles) => ({
      totalFiles: processedFiles.length,
      totalCharacters: processedFiles.reduce((acc, f) => acc + f.content.length, 0),
      totalTokens: 0,
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
      fileCharCounts: Object.fromEntries(processedFiles.map((f) => [f.path, f.content.length])),
      fileTokenCounts: Object.fromEntries(processedFiles.map((f) => [f.path, 0])),
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
    }),
  });

describe('output.patterns per-root-relative matching (end-to-end)', () => {
  let rootParent: string;
  let rootApp: string;
  let rootLib: string;
  let outputDir: string;
  let outputPath: string;

  beforeEach(async () => {
    rootParent = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-inclusion-level-'));
    rootApp = path.join(rootParent, 'app');
    rootLib = path.join(rootParent, 'lib');
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-inclusion-level-out-'));
    outputPath = path.join(outputDir, 'output.md');

    await fs.mkdir(path.join(rootApp, 'src'), { recursive: true });
    await fs.writeFile(path.join(rootApp, 'README.md'), '# App\nREADME_A_CONTENT\n');
    await fs.writeFile(path.join(rootApp, 'src', 'index.ts'), 'export const a = "SRC_A_CONTENT";\n');

    await fs.mkdir(path.join(rootLib, 'src'), { recursive: true });
    await fs.writeFile(path.join(rootLib, 'README.md'), '# Lib\nREADME_B_CONTENT\n');
    await fs.writeFile(path.join(rootLib, 'src', 'index.ts'), 'export const b = "SRC_B_CONTENT";\n');
  });

  afterEach(async () => {
    await fs.rm(rootParent, { recursive: true, force: true });
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  it('single root: drops src content via `src/**` while keeping it in the directory tree', async () => {
    const config = buildConfig(rootParent, outputPath);
    const result = await runPack([rootApp], config);
    const output = await fs.readFile(outputPath, 'utf-8');

    // The src file is excluded from the content output; only the README remains.
    expect(result.processedFiles.map((f) => f.path).sort()).toEqual(['README.md']);
    expect(output).toContain('README_A_CONTENT');
    expect(output).not.toContain('SRC_A_CONTENT');
    // ...but the src file still appears in the directory structure.
    expect(output).toContain('index.ts');
  });

  it('multiple roots: `src/**` matches per-root without a root-label prefix', async () => {
    const config = buildConfig(rootParent, outputPath);
    const result = await runPack([rootApp, rootLib], config);
    const output = await fs.readFile(outputPath, 'utf-8');

    // Even though the display paths are `app/src/index.ts` and `lib/src/index.ts`,
    // the bare `src/**` pattern matches each root's per-root-relative path, so
    // BOTH src files are dropped from the content output.
    expect(result.processedFiles.map((f) => f.path).sort()).toEqual(['app/README.md', 'lib/README.md']);
    expect(output).toContain('README_A_CONTENT');
    expect(output).toContain('README_B_CONTENT');
    expect(output).not.toContain('SRC_A_CONTENT');
    expect(output).not.toContain('SRC_B_CONTENT');
    // Both src files still appear in the per-root directory structure.
    expect(output).toContain('index.ts');
  });

  it('cwd-relative file path style: matching is unaffected by the shifted display path', async () => {
    const config = buildConfig(rootParent, outputPath, { filePathStyle: 'cwd-relative' });
    const result = await runPack([rootApp], config);
    const output = await fs.readFile(outputPath, 'utf-8');

    // The display path is `app/src/index.ts` (cwd-relative), but `src/**` still
    // matches the per-root-relative `src/index.ts`, so the src file is dropped.
    expect(result.processedFiles.map((f) => f.path).sort()).toEqual(['app/README.md']);
    expect(output).toContain('README_A_CONTENT');
    expect(output).not.toContain('SRC_A_CONTENT');
    expect(output).toContain('index.ts');
  });
});
