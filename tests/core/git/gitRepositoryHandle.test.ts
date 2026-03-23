import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  clearGitRepoCache,
  getFileChangeCount,
  isGitInstalled,
  isGitRepository,
} from '../../../src/core/git/gitRepositoryHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitRepositoryHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearGitRepoCache();
  });

  describe('getFileChangeCount', () => {
    test('should count file changes correctly', async () => {
      const mockFilenames = ['file1.ts', 'file2.ts', 'file1.ts', 'file3.ts', 'file2.ts'];

      const mockExecGitLogFilenames = vi.fn().mockResolvedValue(mockFilenames);

      const result = await getFileChangeCount('/test/dir', 5, {
        execGitLogFilenames: mockExecGitLogFilenames,
      });

      expect(result).toEqual({
        'file1.ts': 2,
        'file2.ts': 2,
        'file3.ts': 1,
      });
      expect(mockExecGitLogFilenames).toHaveBeenCalledWith('/test/dir', 5);
    });

    test('should return empty object when git command fails', async () => {
      const mockExecGitLogFilenames = vi.fn().mockRejectedValue(new Error('git command failed'));

      const result = await getFileChangeCount('/test/dir', 5, {
        execGitLogFilenames: mockExecGitLogFilenames,
      });

      expect(result).toEqual({});
      expect(logger.trace).toHaveBeenCalledWith('Failed to get file change counts:', 'git command failed');
    });

    test('should handle empty git log output', async () => {
      const mockExecGitLogFilenames = vi.fn().mockResolvedValue([]);

      const result = await getFileChangeCount('/test/dir', 5, {
        execGitLogFilenames: mockExecGitLogFilenames,
      });

      expect(result).toEqual({});
      expect(mockExecGitLogFilenames).toHaveBeenCalledWith('/test/dir', 5);
    });
  });

  describe('isGitRepository', () => {
    test('should return true when directory is a git repository', async () => {
      const mockExecGitRevParse = vi.fn().mockResolvedValue('true');

      const result = await isGitRepository('/test/dir', {
        execGitRevParse: mockExecGitRevParse,
      });

      expect(result).toBe(true);
      expect(mockExecGitRevParse).toHaveBeenCalledWith('/test/dir');
    });

    test('should return false when directory is not a git repository', async () => {
      const mockExecGitRevParse = vi.fn().mockRejectedValue(new Error('Not a git repository'));

      const result = await isGitRepository('/test/dir', {
        execGitRevParse: mockExecGitRevParse,
      });

      expect(result).toBe(false);
      expect(mockExecGitRevParse).toHaveBeenCalledWith('/test/dir');
    });
  });

  describe('isGitInstalled', () => {
    test('should return true when git is installed', async () => {
      const mockExecGitVersion = vi.fn().mockResolvedValue('git version 2.34.1');

      const result = await isGitInstalled({
        execGitVersion: mockExecGitVersion,
      });

      expect(result).toBe(true);
      expect(mockExecGitVersion).toHaveBeenCalled();
    });

    test('should return false when git command fails', async () => {
      const mockExecGitVersion = vi.fn().mockRejectedValue(new Error('Command not found: git'));

      const result = await isGitInstalled({
        execGitVersion: mockExecGitVersion,
      });

      expect(result).toBe(false);
      expect(mockExecGitVersion).toHaveBeenCalled();
      expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', 'Command not found: git');
    });

    test('should return false when git version output contains error', async () => {
      const mockExecGitVersion = vi.fn().mockResolvedValue('error: git not found');

      const result = await isGitInstalled({
        execGitVersion: mockExecGitVersion,
      });

      expect(result).toBe(false);
      expect(mockExecGitVersion).toHaveBeenCalled();
    });
  });
});
