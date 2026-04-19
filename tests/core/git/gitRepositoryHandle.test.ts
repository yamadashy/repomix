import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as gitCommand from '../../../src/core/git/gitCommand.js';
import {
  clearIsGitRepositoryCache,
  getFileChangeCount,
  isGitInstalled,
  isGitRepository,
} from '../../../src/core/git/gitRepositoryHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitRepositoryHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default-deps callers share a module-level cache; reset between tests
    // so stale entries never leak across cases.
    clearIsGitRepositoryCache();
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

    test('should dedupe concurrent default-deps calls for the same directory', async () => {
      // Spy on the real `execGitRevParse` so the default-deps path hits the
      // cache. Each invocation would otherwise spawn its own subprocess.
      const spy = vi.spyOn(gitCommand, 'execGitRevParse').mockResolvedValue('true');

      const [r1, r2, r3] = await Promise.all([
        isGitRepository('/cached/dir'),
        isGitRepository('/cached/dir'),
        isGitRepository('/cached/dir'),
      ]);

      expect([r1, r2, r3]).toEqual([true, true, true]);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    test('clearIsGitRepositoryCache forces the next default-deps call to re-run', async () => {
      const spy = vi.spyOn(gitCommand, 'execGitRevParse').mockResolvedValue('true');

      await isGitRepository('/reset/dir');
      clearIsGitRepositoryCache();
      await isGitRepository('/reset/dir');

      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockRestore();
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
