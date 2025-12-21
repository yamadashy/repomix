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

    it('handles edge cases: empty string and paths with leading separators', () => {
      // Empty string returns empty string (fallback to normalized)
      expect(getRootEntry('')).toBe('');

      // Path with leading separator - first element is empty, so returns normalized path
      expect(getRootEntry('/absolute/path.ts')).toBe('/absolute/path.ts');

      // Just a separator
      expect(getRootEntry('/')).toBe('/');
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

    it('successfully splits output into multiple parts when content exceeds limit', async () => {
      // Create files in different root entries
      const processedFiles = [
        { path: 'src/a.ts', content: 'source a' },
        { path: 'src/b.ts', content: 'source b' },
        { path: 'tests/test.ts', content: 'test content' },
        { path: 'docs/readme.md', content: 'documentation' },
      ];
      const allFilePaths = ['src/a.ts', 'src/b.ts', 'tests/test.ts', 'docs/readme.md'];

      // Mock that returns different sizes based on number of groups
      // Each group adds ~50 bytes, so 2 groups = ~100 bytes
      const mockGenerateOutput = async (_rootDirs: string[], _config: unknown, files: Array<{ path: string }>) => {
        // Generate output proportional to number of files + some base overhead
        const baseSize = 30;
        const perFileSize = 40;
        return 'x'.repeat(baseSize + files.length * perFileSize);
      };

      const result = await generateSplitOutputParts({
        rootDirs: ['/test'],
        baseConfig: createMockConfig(),
        processedFiles,
        allFilePaths,
        maxBytesPerPart: 120, // Force split after ~2 files worth
        gitDiffResult: undefined,
        gitLogResult: undefined,
        progressCallback: () => {},
        deps: { generateOutput: mockGenerateOutput as ReturnType<typeof createMockDeps>['generateOutput'] },
      });

      // Should create multiple parts
      expect(result.length).toBeGreaterThan(1);

      // Each part should have correct structure
      for (const part of result) {
        expect(part.index).toBeGreaterThan(0);
        expect(part.filePath).toContain(`.${part.index}.`);
        expect(part.content).toBeTruthy();
        expect(part.byteLength).toBeGreaterThan(0);
        expect(part.groups.length).toBeGreaterThan(0);
      }

      // All groups should be distributed across parts (no duplicates)
      const allGroupRootEntries = result.flatMap((p) => p.groups.map((g) => g.rootEntry));
      const uniqueRootEntries = [...new Set(allGroupRootEntries)];
      expect(allGroupRootEntries.length).toBe(uniqueRootEntries.length);

      // Should cover all root entries: docs, src, tests
      expect(uniqueRootEntries.sort()).toEqual(['docs', 'src', 'tests']);
    });

    it('includes git diff/log only in first part', async () => {
      const processedFiles = [
        { path: 'src/a.ts', content: 'source a' },
        { path: 'tests/test.ts', content: 'test content' },
      ];
      const allFilePaths = ['src/a.ts', 'tests/test.ts'];

      const gitDiffResult = { workTreeDiffContent: 'diff content', stagedDiffContent: '' };
      const gitLogResult = { logContent: 'log content', commits: [] };

      // Track what gitDiffResult/gitLogResult were passed for each call
      const callArgs: Array<{
        partIndex: number;
        gitDiffResult: unknown;
        gitLogResult: unknown;
      }> = [];

      const mockGenerateOutput = async (
        _rootDirs: string[],
        config: { output: { git?: { includeDiffs?: boolean; includeLogs?: boolean } } },
        files: Array<{ path: string }>,
        _allFilePaths: string[],
        passedGitDiffResult: unknown,
        passedGitLogResult: unknown,
      ) => {
        // Determine part index based on config (part 1 has includeDiffs/includeLogs true)
        const isFirstPart = config.output.git?.includeDiffs !== false;
        callArgs.push({
          partIndex: isFirstPart ? 1 : callArgs.filter((c) => !c.gitDiffResult).length + 2,
          gitDiffResult: passedGitDiffResult,
          gitLogResult: passedGitLogResult,
        });

        // Return size that forces split
        return 'x'.repeat(100 + files.length * 50);
      };

      await generateSplitOutputParts({
        rootDirs: ['/test'],
        baseConfig: {
          ...createMockConfig(),
          output: {
            ...createMockConfig().output,
            git: {
              includeDiffs: true,
              includeLogs: true,
            },
          },
        } as Parameters<typeof generateSplitOutputParts>[0]['baseConfig'],
        processedFiles,
        allFilePaths,
        maxBytesPerPart: 150, // Force split
        gitDiffResult: gitDiffResult as Parameters<typeof generateSplitOutputParts>[0]['gitDiffResult'],
        gitLogResult: gitLogResult as Parameters<typeof generateSplitOutputParts>[0]['gitLogResult'],
        progressCallback: () => {},
        deps: { generateOutput: mockGenerateOutput as ReturnType<typeof createMockDeps>['generateOutput'] },
      });

      // Find calls where git data was passed (should only be for part 1)
      const callsWithGitData = callArgs.filter((c) => c.gitDiffResult !== undefined);
      const callsWithoutGitData = callArgs.filter((c) => c.gitDiffResult === undefined);

      // At least one call should have git data (part 1)
      expect(callsWithGitData.length).toBeGreaterThan(0);

      // All calls with git data should have the correct values
      for (const call of callsWithGitData) {
        expect(call.gitDiffResult).toEqual(gitDiffResult);
        expect(call.gitLogResult).toEqual(gitLogResult);
      }

      // Calls without git data should exist (part 2+)
      expect(callsWithoutGitData.length).toBeGreaterThan(0);
    });
  });
});
