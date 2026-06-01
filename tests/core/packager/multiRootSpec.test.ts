import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mergeConfigs } from '../../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../../src/config/configSchema.js';
import { collectFiles } from '../../../src/core/file/fileCollect.js';
import { readRawFile } from '../../../src/core/file/fileRead.js';
import { searchFiles } from '../../../src/core/file/fileSearch.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import fileProcessWorker from '../../../src/core/file/workers/fileProcessWorker.js';
import { produceOutput } from '../../../src/core/packager/produceOutput.js';
import { pack } from '../../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../../src/core/security/validateFileSafety.js';

// Behavior-level regression tests for multi-root packing.
//
// PR #1562 (token-count cache) initially merged FileMetrics results by file
// path via a Map, which silently collapsed entries when the same relative path
// appeared under multiple roots (e.g. `packages/a/README.md` and
// `packages/b/README.md` both relativize to `README.md`). That bug was fixed
// at the metrics layer with index-based assembly. The metrics layer is mocked
// out below, so this spec does NOT re-catch the metrics-layer flavor — that
// is owned by calculateFileMetrics.test.ts.
//
// What this spec catches instead is a content-side collapse in any layer that
// operates on the *flattened* (multi-root) file list — `processFiles`,
// `produceOutput`, or any intermediate assembly between them. A Map<path, ...>
// dedup at that level would drop one root's bytes from the file we hand to
// the LLM. The unique content sentinels per root make that visible.
//
// Out of scope:
// - `collectFiles` itself is called once per root, so a per-call internal
//   dedup-by-path would not collapse cross-root copies and would not be
//   detected here.
// - A collapse in the file-tree generator alone would still let both root
//   bodies reach the files section — see tests around
//   `generateTreeStringWithRoots` for tree-only guarantees.

const buildMergedConfig = (
  cwd: string,
  outputFilePath: string,
  style: RepomixOutputStyle,
  overrides: Partial<RepomixConfigFile> = {},
): RepomixConfigMerged =>
  mergeConfigs(cwd, overrides, {
    output: {
      filePath: outputFilePath,
      style,
      git: { sortByChanges: false, includeDiffs: false, includeLogs: false },
    },
  });

const runPack = (rootDirs: string[], config: RepomixConfigMerged) =>
  pack(rootDirs, config, () => {}, {
    searchFiles,
    sortPaths: (filePaths) => filePaths,
    collectFiles: (filePaths, root, cfg, progressCallback) =>
      collectFiles(filePaths, root, cfg, progressCallback, { readRawFile }),
    processFiles: async (rawFiles, cfg) => {
      const processedFiles: ProcessedFile[] = [];
      for (const rawFile of rawFiles) {
        processedFiles.push(await fileProcessWorker({ rawFile, config: cfg }));
      }
      return processedFiles;
    },
    // No secrets in these fixtures — short-circuit the security scan to keep
    // the test fast and focused on the multi-root assembly path.
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
    createSecurityCheckTaskRunner: () => ({
      taskRunner: { run: async () => [], cleanup: async () => {} },
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

const countOccurrences = (haystack: string, needle: string): number => {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
};

describe('multi-root pack spec', () => {
  let rootA: string;
  let rootB: string;
  let outputDir: string;
  let outputPath: string;

  beforeEach(async () => {
    rootA = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-multiroot-a-'));
    rootB = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-multiroot-b-'));
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-multiroot-out-'));
    outputPath = path.join(outputDir, 'output.xml');

    // Same relative path in each root, but unique content so a collapsing
    // implementation produces an obviously-wrong output.
    await fs.writeFile(path.join(rootA, 'README.md'), '# Root A\nMARKER_FROM_ROOT_A\n');
    await fs.mkdir(path.join(rootA, 'src'));
    await fs.writeFile(path.join(rootA, 'src', 'index.ts'), 'export const fromA = "ROOT_A_SRC_MARKER";\n');

    await fs.writeFile(path.join(rootB, 'README.md'), '# Root B (totally different)\nMARKER_FROM_ROOT_B\n');
    await fs.mkdir(path.join(rootB, 'lib'));
    await fs.writeFile(path.join(rootB, 'lib', 'util.ts'), 'export const fromB = "ROOT_B_LIB_MARKER";\n');
  });

  afterEach(async () => {
    await fs.rm(rootA, { recursive: true, force: true });
    await fs.rm(rootB, { recursive: true, force: true });
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  // Note on `totalFiles`: a separate pre-existing quirk in `sortedFilePathsByDir`
  // means the same relative path appears in each root's collect input (e.g.
  // `README.md` is filtered from the global sorted list per-root, so duplicates
  // pass twice). That inflates `result.totalFiles` beyond 4. This spec is
  // intentionally narrow: it verifies the *unique content* contract — both
  // roots' real bytes reach the packed output — and does not assert on
  // counts, which would couple it to that unrelated quirk.

  it('preserves both unique contents of a duplicate relative path when packing multiple roots (xml)', async () => {
    const config = buildMergedConfig(outputDir, outputPath, 'xml');
    await runPack([rootA, rootB], config);

    const output = await fs.readFile(outputPath, 'utf-8');
    // The contract: each root's bytes survive into the pack. A
    // Map<path, FileMetrics> collapse — the one PR #1562 fixed in the metrics
    // layer — would drop one of these markers entirely.
    expect(output).toContain('MARKER_FROM_ROOT_A');
    expect(output).toContain('MARKER_FROM_ROOT_B');
    expect(output).toContain('ROOT_A_SRC_MARKER');
    expect(output).toContain('ROOT_B_LIB_MARKER');
  });

  it('preserves both unique contents in plain style too', async () => {
    // Plain style takes a different rendering path; the assertion is
    // style-agnostic because the collapse, if reintroduced, would surface
    // identically in both.
    const config = buildMergedConfig(outputDir, outputPath, 'plain');
    await runPack([rootA, rootB], config);

    const output = await fs.readFile(outputPath, 'utf-8');
    expect(output).toContain('MARKER_FROM_ROOT_A');
    expect(output).toContain('MARKER_FROM_ROOT_B');
  });

  // Sanity check on the deduplication direction: each unique sentinel must
  // appear at most twice (the pre-existing `sortedFilePathsByDir` quirk causes
  // each root's bytes to be packed twice). If an over-eager perf change starts
  // multiplying entries further, this catches it.
  it('does not balloon a duplicated path beyond the existing 2x quirk', async () => {
    const config = buildMergedConfig(outputDir, outputPath, 'xml');
    await runPack([rootA, rootB], config);

    const output = await fs.readFile(outputPath, 'utf-8');
    expect(countOccurrences(output, 'MARKER_FROM_ROOT_A')).toBeLessThanOrEqual(2);
    expect(countOccurrences(output, 'MARKER_FROM_ROOT_B')).toBeLessThanOrEqual(2);
  });
});
