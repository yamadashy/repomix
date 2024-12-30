import { beforeEach, describe, expect, test, vi } from 'vitest';
import { execGitShallowClone, isGitInstalled } from '../../../src/core/file/gitCommand.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isGitInstalled', () => {
    test('should return true when git is installed', async () => {
      const mockExecAsync = vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' });

      const result = await isGitInstalled({ execAsync: mockExecAsync });

      expect(result).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith('git --version');
    });

    test('should return false when git command fails', async () => {
      const mockExecAsync = vi.fn().mockRejectedValue(new Error('Command not found: git'));

      const result = await isGitInstalled({ execAsync: mockExecAsync });

      expect(result).toBe(false);
      expect(mockExecAsync).toHaveBeenCalledWith('git --version');
      expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', 'Command not found: git');
    });

    test('should return false when git command returns stderr', async () => {
      const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: 'git: command not found' });

      const result = await isGitInstalled({ execAsync: mockExecAsync });

      expect(result).toBe(false);
      expect(mockExecAsync).toHaveBeenCalledWith('git --version');
    });
  });

  describe('execGitShallowClone', () => {
    test('should execute git clone with correct parameters for branch', async () => {
      const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const branch = 'master';

      await execGitShallowClone(url, directory, branch, { execAsync: mockExecAsync });

      expect(mockExecAsync).toHaveBeenCalledWith(`git clone --depth 1 ${url} ${directory}`);
      expect(mockExecAsync).toHaveBeenCalledWith(`git -C ${directory} checkout ${branch}`);
    });

    test('should execute git clone and checkout with correct parameters for commit hash', async () => {
      const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const commitHash = 'abc123def456';

      await execGitShallowClone(url, directory, commitHash, { execAsync: mockExecAsync });

      expect(mockExecAsync).toHaveBeenCalledWith(`git clone --depth 1 ${url} ${directory}`);
      expect(mockExecAsync).toHaveBeenCalledWith(`git -C ${directory} checkout ${commitHash}`);
    });

    test('should execute without branchOrCommit option if not specified by user', async () => {
      const mockExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const branchOrCommit = undefined;

      await execGitShallowClone(url, directory, branchOrCommit, { execAsync: mockExecAsync });

      expect(mockExecAsync).toHaveBeenCalledWith(`git clone --depth 1 ${url} ${directory}`);
    });

    test('should throw error when git clone fails', async () => {
      const mockExecAsync = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const branch = 'master';

      await expect(execGitShallowClone(url, directory, branch, { execAsync: mockExecAsync })).rejects.toThrow(
        'Authentication failed',
      );

      expect(mockExecAsync).toHaveBeenCalledWith(`git clone --depth 1 ${url} ${directory}`);
    });

    test('should throw error when checkout fails for commit hash', async () => {
      const mockExecAsync = vi
        .fn()
        .mockImplementation((cmd) =>
          cmd.includes('checkout')
            ? Promise.reject(new Error('Checkout failed'))
            : Promise.resolve({ stdout: '', stderr: '' }),
        );
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const commitHash = 'abc123def456';

      await expect(execGitShallowClone(url, directory, commitHash, { execAsync: mockExecAsync })).rejects.toThrow(
        'Checkout failed',
      );

      expect(mockExecAsync).toHaveBeenCalledWith(`git clone --depth 1 ${url} ${directory}`);
      expect(mockExecAsync).toHaveBeenCalledWith(`git -C ${directory} checkout ${commitHash}`);
    });
  });
});
