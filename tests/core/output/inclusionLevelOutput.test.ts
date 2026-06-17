import { describe, expect, it } from 'vitest';
import { processFiles } from '../../../src/core/file/fileProcess.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import { generateOutput } from '../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../testing/testUtils.js';

// End-to-end coverage for the output.patterns "directory-only" inclusion level
// (issue #608). This composes the two halves the packager wires together:
//   - processFiles produces the per-file content blocks
//   - generateOutput renders the directory tree from the search path list
// The directory tree is built from `allFilePaths` (the search results, passed
// through unchanged), while content blocks come from `processedFiles`. A
// directory-only file must therefore still appear in the tree even though its
// content is dropped from processedFiles.

describe('output.patterns directory-only inclusion level (end-to-end)', () => {
  const rootDir = '/repo';

  it('lists a directory-only file in the directory structure but omits its content block', async () => {
    const rawFiles: RawFile[] = [
      { path: 'src/index.ts', content: 'export const greeting = "hello";' },
      { path: 'website/index.html', content: '<html>OMITTED_WEBSITE_BODY</html>' },
    ];
    // Mirrors the packager: allFilePaths comes from the file search and is NOT
    // filtered by inclusion level, so the directory-only path still feeds the tree.
    const allFilePaths = ['src/index.ts', 'website/index.html'];
    const config = createMockConfig({
      cwd: rootDir,
      output: {
        style: 'markdown',
        git: { sortByChanges: false },
        patterns: [{ pattern: 'website/**/*', directoryStructureOnly: true }],
      },
    });

    const processedFiles = await processFiles(rawFiles, config, () => {});

    // The directory-only file is dropped from the content output.
    expect(processedFiles.map((f) => f.path)).toEqual(['src/index.ts']);

    const output = await generateOutput([rootDir], config, processedFiles, allFilePaths);

    // The directory structure still lists the directory-only file's path...
    expect(output).toContain('website/');
    expect(output).toContain('index.html');
    // ...but its content block is omitted entirely.
    expect(output).not.toContain('OMITTED_WEBSITE_BODY');
    // The full-content file is rendered as usual.
    expect(output).toContain('export const greeting = "hello";');
  });

  it('keeps a directory-only directory in the tree even when all its files are excluded', async () => {
    const rawFiles: RawFile[] = [
      { path: 'src/index.ts', content: 'export const a = 1;' },
      { path: 'website/css/site.css', content: 'body { color: OMITTED; }' },
      { path: 'website/index.html', content: '<html>OMITTED</html>' },
    ];
    const allFilePaths = ['src/index.ts', 'website/css/site.css', 'website/index.html'];
    const config = createMockConfig({
      cwd: rootDir,
      output: {
        style: 'markdown',
        git: { sortByChanges: false },
        patterns: [{ pattern: 'website/**/*', directoryStructureOnly: true }],
      },
    });

    const processedFiles = await processFiles(rawFiles, config, () => {});

    // Every website file is excluded from content; only src remains.
    expect(processedFiles.map((f) => f.path)).toEqual(['src/index.ts']);

    const output = await generateOutput([rootDir], config, processedFiles, allFilePaths);

    // The website directory and its files are still represented in the tree.
    expect(output).toContain('website/');
    expect(output).toContain('site.css');
    expect(output).toContain('index.html');
    // None of the excluded files leak their content.
    expect(output).not.toContain('OMITTED');
  });
});
