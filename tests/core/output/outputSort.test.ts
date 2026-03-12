import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:fs/promises');

describe('outputSort', () => {
  const sep = path.sep;

  // Reset module cache before each test to ensure clean state for caching tests
  beforeEach(async () => {
    vi.resetModules();
  });

  describe('sort by git changes', () => {
    const mockConfig = createMockConfig({
      output: {
        git: {
          sortByChanges: true,
          sortByChangesMaxCommits: 150,
        },
      },
      cwd: '/test',
    });

    test('should sort files by git change count', async () => {
      const { sortOutputFiles } = await import('../../../src/core/output/outputSort.js');
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
      const { sortOutputFiles } = await import('../../../src/core/output/outputSort.js');
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
      const { sortOutputFiles } = await import('../../../src/core/output/outputSort.js');
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
      const { sortOutputFiles } = await import('../../../src/core/output/outputSort.js');
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
      const { sortOutputFiles } = await import('../../../src/core/output/outputSort.js');
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
  });
});
