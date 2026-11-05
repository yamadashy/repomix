import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getGitDiffs, getStagedDiff, getWorkTreeDiff } from '../../../src/core/git/gitDiffHandle.js';
import { logger } from '../../../src/shared/logger.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('gitDiffHandle', () => {
  beforeEach(() => {
    silenceLogger();
  });

  describe('getWorkTreeDiff', () => {
    test('should return diffs when directory is a git repository', async () => {
      const mockDiff = 'diff --git a/file.txt b/file.txt\n+new line';
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);
      const mockExecGitDiff = vi.fn().mockResolvedValue(mockDiff);

      const result = await getWorkTreeDiff('/test/dir', {
        execGitDiff: mockExecGitDiff,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe(mockDiff);
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitDiff).toHaveBeenCalledWith('/test/dir', []);
    });

    test('should return empty string when directory is not a git repository', async () => {
      const mockIsGitRepository = vi.fn().mockResolvedValue(false);
      const mockExecGitDiff = vi.fn();

      const result = await getWorkTreeDiff('/test/dir', {
        execGitDiff: mockExecGitDiff,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe('');
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitDiff).not.toHaveBeenCalled();
    });

    test('should return empty string when git diff command fails', async () => {
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);
      const mockExecGitDiff = vi.fn().mockRejectedValue(new Error('Failed to get diff'));

      const result = await getWorkTreeDiff('/test/dir', {
        execGitDiff: mockExecGitDiff,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe('');
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitDiff).toHaveBeenCalledWith('/test/dir', []);
      expect(logger.trace).toHaveBeenCalledWith('Failed to get git diff:', 'Failed to get diff');
    });
  });

  describe('getStagedDiff', () => {
    test('should return staged diffs when directory is a git repository', async () => {
      const mockDiff = 'diff --git a/staged.txt b/staged.txt\n+staged content';
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);
      const mockExecGitDiff = vi.fn().mockResolvedValue(mockDiff);

      const result = await getStagedDiff('/test/dir', {
        execGitDiff: mockExecGitDiff,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBe(mockDiff);
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitDiff).toHaveBeenCalledWith('/test/dir', ['--cached']);
    });
  });

  describe('getGitDiffs', () => {
    test('should return git diffs when includeDiffs is enabled', async () => {
      const mockWorkTreeDiff = 'diff --git a/file.txt b/file.txt\n+new line';
      const mockStagedDiff = 'diff --git a/staged.txt b/staged.txt\n+staged content';
      const mockGetWorkTreeDiff = vi.fn().mockResolvedValue(mockWorkTreeDiff);
      const mockGetStagedDiff = vi.fn().mockResolvedValue(mockStagedDiff);

      const mockConfig = createMockConfig({
        cwd: '/test/repo',
        output: {
          git: {
            includeDiffs: true,
          },
        },
      });

      const result = await getGitDiffs(['/test/repo'], mockConfig, {
        getWorkTreeDiff: mockGetWorkTreeDiff,
        getStagedDiff: mockGetStagedDiff,
      });

      expect(result).toEqual({
        workTreeDiffContent: mockWorkTreeDiff,
        stagedDiffContent: mockStagedDiff,
      });
      expect(mockGetWorkTreeDiff).toHaveBeenCalledWith('/test/repo');
      expect(mockGetStagedDiff).toHaveBeenCalledWith('/test/repo');
    });

    test('should return undefined when includeDiffs is disabled', async () => {
      const mockGetWorkTreeDiff = vi.fn();
      const mockGetStagedDiff = vi.fn();

      const mockConfig = createMockConfig({
        cwd: '/test/repo',
        output: {
          git: {
            includeDiffs: false,
          },
        },
      });

      const result = await getGitDiffs(['/test/repo'], mockConfig, {
        getWorkTreeDiff: mockGetWorkTreeDiff,
        getStagedDiff: mockGetStagedDiff,
      });

      expect(result).toBeUndefined();
      expect(mockGetWorkTreeDiff).not.toHaveBeenCalled();
      expect(mockGetStagedDiff).not.toHaveBeenCalled();
    });

    test('should use cwd when rootDirs is empty', async () => {
      const mockWorkTreeDiff = 'diff content';
      const mockStagedDiff = '';
      const mockGetWorkTreeDiff = vi.fn().mockResolvedValue(mockWorkTreeDiff);
      const mockGetStagedDiff = vi.fn().mockResolvedValue(mockStagedDiff);

      const mockConfig = createMockConfig({
        cwd: '/fallback/dir',
        output: {
          git: {
            includeDiffs: true,
          },
        },
      });

      const result = await getGitDiffs([], mockConfig, {
        getWorkTreeDiff: mockGetWorkTreeDiff,
        getStagedDiff: mockGetStagedDiff,
      });

      expect(result).toEqual({
        workTreeDiffContent: mockWorkTreeDiff,
        stagedDiffContent: mockStagedDiff,
      });
      // createMockConfig sets cwd to the actual working directory, so we check the actual config value
      expect(mockGetWorkTreeDiff).toHaveBeenCalledWith(mockConfig.cwd);
      expect(mockGetStagedDiff).toHaveBeenCalledWith(mockConfig.cwd);
    });

    test('should throw error when diff operations fail', async () => {
      const mockGetWorkTreeDiff = vi.fn().mockRejectedValue(new Error('Failed to get diff'));
      const mockGetStagedDiff = vi.fn();

      const mockConfig = createMockConfig({
        cwd: '/test/repo',
        output: {
          git: {
            includeDiffs: true,
          },
        },
      });

      await expect(
        getGitDiffs(['/test/repo'], mockConfig, {
          getWorkTreeDiff: mockGetWorkTreeDiff,
          getStagedDiff: mockGetStagedDiff,
        }),
      ).rejects.toThrow('Failed to get git diffs: Failed to get diff');

      expect(mockGetWorkTreeDiff).toHaveBeenCalledWith('/test/repo');
    });
  });
});
