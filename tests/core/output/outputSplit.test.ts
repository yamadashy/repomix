import { describe, expect, it } from 'vitest';
import {
  buildOutputSplitGroups,
  buildSplitOutputFilePath,
  generateSplitOutputParts,
  getRootEntry,
} from '../../../src/core/output/outputSplit.js';

describe('outputSplit', () => {
  describe('getRootEntry', () => {
    it('returns the top-level folder for nested paths', () => {
      expect(getRootEntry('src/a.ts')).toBe('src');
      expect(getRootEntry('src/nested/b.ts')).toBe('src');
    });

    it('returns the file itself for root files', () => {
      expect(getRootEntry('README.md')).toBe('README.md');
    });
  });

  describe('buildOutputSplitGroups', () => {
    it('groups by root entry and does not split within a folder', () => {
      const processedFiles = [
        { path: 'src/a.ts', content: 'a' },
        { path: 'src/b.ts', content: 'b' },
        { path: 'README.md', content: 'readme' },
      ];
      const allFilePaths = ['src/a.ts', 'src/b.ts', 'README.md', 'src/ignored.txt'];

      const groups = buildOutputSplitGroups(processedFiles, allFilePaths);

      const readme = groups.find((g) => g.rootEntry === 'README.md');
      const src = groups.find((g) => g.rootEntry === 'src');

      expect(readme?.processedFiles.map((f) => f.path)).toEqual(['README.md']);
      expect(src?.processedFiles.map((f) => f.path).sort()).toEqual(['src/a.ts', 'src/b.ts']);
      expect(src?.allFilePaths.sort()).toEqual(['src/a.ts', 'src/b.ts', 'src/ignored.txt']);
    });
  });

  describe('buildSplitOutputFilePath', () => {
    it('inserts part index before extension', () => {
      expect(buildSplitOutputFilePath('repomix-output.xml', 1)).toBe('repomix-output.1.xml');
      expect(buildSplitOutputFilePath('out.tar.xml', 2)).toBe('out.tar.2.xml');
    });

    it('appends part index when no extension exists', () => {
      expect(buildSplitOutputFilePath('output', 3)).toBe('output.3');
    });
  });

  describe('generateSplitOutputParts', () => {
    const createMockConfig = () =>
      ({
        output: {
          filePath: 'repomix-output.xml',
          git: {
            includeDiffs: false,
            includeLogs: false,
          },
        },
      }) as Parameters<typeof generateSplitOutputParts>[0]['baseConfig'];

    const createMockDeps = (outputSize: number) => ({
      generateOutput: async () => 'x'.repeat(outputSize),
    });

    it('throws error when single root entry exceeds maxBytesPerPart', async () => {
      const processedFiles = [{ path: 'src/large.ts', content: 'large content' }];
      const allFilePaths = ['src/large.ts'];

      await expect(
        generateSplitOutputParts({
          rootDirs: ['/test'],
          baseConfig: createMockConfig(),
          processedFiles,
          allFilePaths,
          maxBytesPerPart: 10, // Very small limit
          gitDiffResult: undefined,
          gitLogResult: undefined,
          progressCallback: () => {},
          deps: createMockDeps(100), // Output larger than limit
        }),
      ).rejects.toThrow(/exceeds max size/);
    });

    it('throws error for invalid maxBytesPerPart', async () => {
      await expect(
        generateSplitOutputParts({
          rootDirs: ['/test'],
          baseConfig: createMockConfig(),
          processedFiles: [],
          allFilePaths: [],
          maxBytesPerPart: 0,
          gitDiffResult: undefined,
          gitLogResult: undefined,
          progressCallback: () => {},
          deps: createMockDeps(0),
        }),
      ).rejects.toThrow(/Invalid maxBytesPerPart/);

      await expect(
        generateSplitOutputParts({
          rootDirs: ['/test'],
          baseConfig: createMockConfig(),
          processedFiles: [],
          allFilePaths: [],
          maxBytesPerPart: -1,
          gitDiffResult: undefined,
          gitLogResult: undefined,
          progressCallback: () => {},
          deps: createMockDeps(0),
        }),
      ).rejects.toThrow(/Invalid maxBytesPerPart/);
    });

    it('returns empty array when no files provided', async () => {
      const result = await generateSplitOutputParts({
        rootDirs: ['/test'],
        baseConfig: createMockConfig(),
        processedFiles: [],
        allFilePaths: [],
        maxBytesPerPart: 1000,
        gitDiffResult: undefined,
        gitLogResult: undefined,
        progressCallback: () => {},
        deps: createMockDeps(0),
      });

      expect(result).toEqual([]);
    });
  });
});
