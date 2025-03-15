import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { sortOutputFiles } from '../../../src/core/output/outputSort.js';

vi.mock('node:fs/promises');

describe('outputSort', () => {
  const sep = path.sep;

  describe('sort by git changes', () => {
    const mockConfig = {
      output: {
        git: {
          sortByChanges: true,
          sortByChangesMaxCommits: 150,
        },
      },
      cwd: '/test',
    } as unknown as RepomixConfigMerged;

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

      expect(mockGetFileChangeCount).toHaveBeenCalledWith('/test', 150);
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

      const config = {
        output: {
          git: {
            sortByChanges: false,
          },
        },
        cwd: '/test',
      } as unknown as RepomixConfigMerged;

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
  });
});
