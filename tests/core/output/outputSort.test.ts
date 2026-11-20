import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { prefetchSortData, sortOutputFiles } from '../../../src/core/output/outputSort.js';
import { createTempDir } from '../../testing/tempDir.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('outputSort', () => {
  const sep = path.sep;

  // sortOutputFiles only consults git when `<cwd>/.git` exists, so run against a
  // real temp directory that contains an empty `.git` folder. outputSort caches git
  // results per cwd, so a fresh directory per test also keeps those caches isolated.
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await createTempDir('repomix-output-sort-');
    await fs.mkdir(path.join(repoDir, '.git'));
  });

  describe('sort by git changes', () => {
    let mockConfig: ReturnType<typeof createMockConfig>;

    beforeEach(() => {
      mockConfig = createMockConfig({
        output: {
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 150,
          },
        },
        cwd: repoDir,
      });
    });

    test('should sort files by git change count', async () => {
      const input: ProcessedFile[] = [
        { path: `src${sep}utils${sep}file1.ts`, content: 'content1' },
        { path: `src${sep}utils${sep}file2.ts`, content: 'content2' },
        { path: `src${sep}utils${sep}file3.ts`, content: 'content3' },
      ];

      const mockGetFileChangeCount = vi.fn().mockResolvedValue({
        [`src${sep}utils${sep}file1.ts`]: 5,
        [`src${sep}utils${sep}file2.ts`]: 10,
        [`src${sep}utils${sep}file3.ts`]: 2,
      });

      const mockIsGitInstalled = vi.fn().mockResolvedValue(true);

      const expected = [
        { path: `src${sep}utils${sep}file3.ts`, content: 'content3' }, // 2 changes
        { path: `src${sep}utils${sep}file1.ts`, content: 'content1' }, // 5 changes
        { path: `src${sep}utils${sep}file2.ts`, content: 'content2' }, // 10 changes
      ];

      expect(
        await sortOutputFiles(input, mockConfig, {
          getFileChangeCount: mockGetFileChangeCount,
          isGitInstalled: mockIsGitInstalled,
        }),
      ).toEqual(expected);

      expect(mockGetFileChangeCount).toHaveBeenCalledWith(expect.any(String), 150);
      expect(mockIsGitInstalled).toHaveBeenCalled();
    });

    test('should return original order when git is not installed', async () => {
      const input: ProcessedFile[] = [
        { path: `src${sep}utils${sep}file1.ts`, content: 'content1' },
        { path: `src${sep}utils${sep}file2.ts`, content: 'content2' },
      ];

      const mockGetFileChangeCount = vi.fn();
      const mockIsGitInstalled = vi.fn().mockResolvedValue(false);

      const result = await sortOutputFiles(input, mockConfig, {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: mockIsGitInstalled,
      });

      expect(result).toEqual(input);
      expect(mockGetFileChangeCount).not.toHaveBeenCalled();
    });

    test('should return original order when git command fails', async () => {
      const input: ProcessedFile[] = [
        { path: `src${sep}utils${sep}file1.ts`, content: 'content1' },
        { path: `src${sep}utils${sep}file2.ts`, content: 'content2' },
      ];

      const mockGetFileChangeCount = vi.fn().mockRejectedValue(new Error('git command failed'));
      const mockIsGitInstalled = vi.fn().mockResolvedValue(true);

      const result = await sortOutputFiles(input, mockConfig, {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: mockIsGitInstalled,
      });

      expect(result).toEqual(input);
    });

    test('should return original order when git sort is disabled', async () => {
      const input: ProcessedFile[] = [
        { path: `src${sep}utils${sep}file1.ts`, content: 'content1' },
        { path: `src${sep}utils${sep}file2.ts`, content: 'content2' },
      ];

      const config = createMockConfig({
        output: {
          git: {
            sortByChanges: false,
          },
        },
        cwd: '/test',
      });

      const mockGetFileChangeCount = vi.fn();
      const mockIsGitInstalled = vi.fn();

      const result = await sortOutputFiles(input, config, {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: mockIsGitInstalled,
      });

      expect(result).toEqual(input);
      expect(mockGetFileChangeCount).not.toHaveBeenCalled();
      expect(mockIsGitInstalled).not.toHaveBeenCalled();
    });

    test('should cache git file change counts for repeated calls', async () => {
      const input1: ProcessedFile[] = [
        { path: `src${sep}file1.ts`, content: 'content1' },
        { path: `src${sep}file2.ts`, content: 'content2' },
      ];
      const input2: ProcessedFile[] = [{ path: `src${sep}file3.ts`, content: 'content3' }];

      const mockGetFileChangeCount = vi.fn().mockResolvedValue({
        [`src${sep}file1.ts`]: 5,
        [`src${sep}file2.ts`]: 10,
        [`src${sep}file3.ts`]: 2,
      });
      const mockIsGitInstalled = vi.fn().mockResolvedValue(true);

      // First call - should call getFileChangeCount
      await sortOutputFiles(input1, mockConfig, {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: mockIsGitInstalled,
      });

      expect(mockGetFileChangeCount).toHaveBeenCalledTimes(1);
      expect(mockIsGitInstalled).toHaveBeenCalledTimes(1);

      // Second call with same config - should use cache
      await sortOutputFiles(input2, mockConfig, {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: mockIsGitInstalled,
      });

      // getFileChangeCount should NOT be called again (cached)
      expect(mockGetFileChangeCount).toHaveBeenCalledTimes(1);
      // isGitInstalled should also be cached
      expect(mockIsGitInstalled).toHaveBeenCalledTimes(1);
    });

    test('drops the counts an earlier run read when the next run prefetches', async () => {
      // The MCP server runs the CLI once per tool call from one process, so a
      // second pack used to sort by the counts the first one had read.
      const input: ProcessedFile[] = [
        { path: `src${sep}a.ts`, content: 'a' },
        { path: `src${sep}b.ts`, content: 'b' },
      ];
      const mockGetFileChangeCount = vi
        .fn()
        .mockResolvedValueOnce({ [`src${sep}a.ts`]: 1, [`src${sep}b.ts`]: 9 })
        .mockResolvedValueOnce({ [`src${sep}a.ts`]: 9, [`src${sep}b.ts`]: 1 });
      const deps = {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: vi.fn().mockResolvedValue(true),
      };

      const first = await sortOutputFiles(input, mockConfig, deps);
      expect(first.map((file) => file.path)).toEqual([`src${sep}a.ts`, `src${sep}b.ts`]);

      // What pack() does at the start of a run: the commits since the last one
      // have to be read, or the order is that of a history that is gone.
      await prefetchSortData(mockConfig, deps);
      const second = await sortOutputFiles(input, mockConfig, deps);

      expect(second.map((file) => file.path)).toEqual([`src${sep}b.ts`, `src${sep}a.ts`]);
      expect(mockGetFileChangeCount).toHaveBeenCalledTimes(2);
    });

    test('does not store counts from a fetch that started before the next run cleared the cache', async () => {
      // Two packs of the same directory overlap in the MCP server: the second one
      // clears the caches while the first one's `git log` is still running. The
      // late answer describes the history the first run had, so keeping it would
      // undo the clear.
      const input: ProcessedFile[] = [
        { path: `src${sep}a.ts`, content: 'a' },
        { path: `src${sep}b.ts`, content: 'b' },
      ];
      let resolveStale: (counts: Record<string, number>) => void = () => {};
      const staleFetch = new Promise<Record<string, number>>((resolve) => {
        resolveStale = resolve;
      });
      const mockGetFileChangeCount = vi
        .fn()
        .mockImplementationOnce(() => staleFetch)
        .mockResolvedValueOnce({ [`src${sep}a.ts`]: 9, [`src${sep}b.ts`]: 1 });
      const deps = {
        getFileChangeCount: mockGetFileChangeCount,
        isGitInstalled: vi.fn().mockResolvedValue(true),
      };

      const firstRun = sortOutputFiles(input, mockConfig, deps);
      await vi.waitFor(() => expect(mockGetFileChangeCount).toHaveBeenCalledTimes(1));

      // The second pack starts and reads the current history.
      await prefetchSortData(mockConfig, deps);

      // The first pack's git log now answers with counts from before that.
      resolveStale({ [`src${sep}a.ts`]: 1, [`src${sep}b.ts`]: 9 });
      await firstRun;

      const third = await sortOutputFiles(input, mockConfig, deps);

      expect(third.map((file) => file.path)).toEqual([`src${sep}b.ts`, `src${sep}a.ts`]);
      expect(mockGetFileChangeCount).toHaveBeenCalledTimes(2);
    });
  });
});
