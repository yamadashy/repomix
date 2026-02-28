import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getGitBlame } from '../../../src/core/git/gitBlameHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitBlameHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getGitBlame', () => {
    test('should return blame output when directory is a git repository', async () => {
      const mockBlameOutput = `4b84c8a5a7b6c5d4e3f2a1b2c3d4e5f6a7b8c9d0
author Author Name
author-time 1733232000
\tcode line`;
      const mockExecGitBlame = vi.fn().mockResolvedValue(mockBlameOutput);
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      const result = await getGitBlame('/test/dir', 'file.ts', {
        execGitBlame: mockExecGitBlame,
        isGitRepository: mockIsGitRepository,
      });

      const expectedOutput = '[Author Name 2024-12-03] code line';
      expect(result).toBe(expectedOutput);
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitBlame).toHaveBeenCalledWith('/test/dir', 'file.ts');
    });

    test('should return null when directory is not a git repository', async () => {
      const mockExecGitBlame = vi.fn();
      const mockIsGitRepository = vi.fn().mockResolvedValue(false);

      const result = await getGitBlame('/test/dir', 'file.ts', {
        execGitBlame: mockExecGitBlame,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBeNull();
      expect(mockIsGitRepository).toHaveBeenCalledWith('/test/dir');
      expect(mockExecGitBlame).not.toHaveBeenCalled();
      expect(logger.trace).toHaveBeenCalledWith('Directory /test/dir is not a git repository, skipping git blame');
    });

    test('should return null when blame output is empty (e.g. untracked file)', async () => {
      const mockExecGitBlame = vi.fn().mockResolvedValue('');
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      const result = await getGitBlame('/test/dir', 'untracked.ts', {
        execGitBlame: mockExecGitBlame,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBeNull();
      expect(mockExecGitBlame).toHaveBeenCalledWith('/test/dir', 'untracked.ts');
    });

    test('should return null and log trace when execution fails', async () => {
      const mockError = new Error('git command failed');
      const mockExecGitBlame = vi.fn().mockRejectedValue(mockError);
      const mockIsGitRepository = vi.fn().mockResolvedValue(true);

      const result = await getGitBlame('/test/dir', 'file.ts', {
        execGitBlame: mockExecGitBlame,
        isGitRepository: mockIsGitRepository,
      });

      expect(result).toBeNull();
      expect(logger.trace).toHaveBeenCalledWith('Failed to get git blame for file.ts:', 'git command failed');
    });
  });
});
