import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  execGitShallowClone,
  getFileChangeCount,
  getWorkTreeDiff,
  isGitInstalled,
  isGitRepository,
} from '../../../src/core/file/gitCommand.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getFileChangeCount', () => {
    test('should count file changes correctly', async () => {
      const mockOutput = `
file1.ts
file2.ts
file1.ts
file3.ts
file2.ts
`.trim();
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await getFileChangeCount('/test/dir', 5, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual({
        'file1.ts': 2,
        'file2.ts': 2,
        'file3.ts': 1,
      });
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'log',
        '--pretty=format:',
        '--name-only',
        '-n',
        '5',
      ]);
    });

    test('should return empty object when git command fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      const result = await getFileChangeCount('/test/dir', 5, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual({});
      expect(logger.trace).toHaveBeenCalledWith('Failed to get file change counts:', 'git command failed');
    });
  });

  describe('isGitInstalled', () => {
    test('should return true when git is installed', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: 'git version 2.34.1', stderr: '' });

      const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(true);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    });

    test('should return false and log error when git command fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Command not found: git'));

      const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(false);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
      expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', 'Command not found: git');
    });

    test('should return false and log error with custom error message', async () => {
      const customError = new Error('Custom git error message');
      const mockFileExecAsync = vi.fn().mockRejectedValue(customError);

      const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(false);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
      expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', 'Custom git error message');
    });

    test('should return false when git command fails with empty error message', async () => {
      const customError = new Error('');
      const mockFileExecAsync = vi.fn().mockRejectedValue(customError);

      const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(false);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
      expect(logger.trace).toHaveBeenCalledWith('Git is not installed:', '');
    });

    test('should return false when git command returns stderr', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: 'git: command not found' });

      const result = await isGitInstalled({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(false);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    });
  });

  describe('isGitRepository', () => {
    test('should return true when directory is a git repository', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: 'true', stderr: '' });
      const directory = '/test/dir';

      const result = await isGitRepository(directory, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(true);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    });

    test('should return false when directory is not a git repository', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Not a git repository'));
      const directory = '/test/dir';

      const result = await isGitRepository(directory, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(false);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    });
  });

  describe('getWorkTreeDiff', () => {
    test('should return diffs when directory is a git repository', async () => {
      const mockDiff =
        'diff --git a/file.txt b/file.txt\nindex 1234..5678 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1,5 +1,5 @@\n-old line\n+new line';
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'true', stderr: '' }) // isGitRepository
        .mockResolvedValueOnce({ stdout: mockDiff, stderr: '' }); // git diff

      const directory = '/test/dir';
      const result = await getWorkTreeDiff(directory, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockDiff);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', [
        '-C',
        directory,
        'rev-parse',
        '--is-inside-work-tree',
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'diff', '--no-color']);
    });

    test('should return empty string when directory is not a git repository', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Not a git repository'));
      const directory = '/test/dir';

      const result = await getWorkTreeDiff(directory, { execFileAsync: mockFileExecAsync });

      expect(result).toBe('');
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    });

    test('should return empty string when git diff command fails', async () => {
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'true', stderr: '' }) // isGitRepository success
        .mockRejectedValueOnce(new Error('Failed to get diff')); // git diff failure

      const directory = '/test/dir';
      const result = await getWorkTreeDiff(directory, { execFileAsync: mockFileExecAsync });

      expect(result).toBe('');
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', [
        '-C',
        directory,
        'rev-parse',
        '--is-inside-work-tree',
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'diff', '--no-color']);
      expect(logger.trace).toHaveBeenCalledWith('Failed to get git diff:', 'Failed to get diff');
    });
  });

  describe('execGitShallowClone', () => {
    test('should execute without branch option if not specified by user', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['clone', '--depth', '1', url, directory]);
    });

    test('should throw error when git clone fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Authentication failed');

      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['clone', '--depth', '1', url, directory]);
    });

    test('should execute commands correctly when branch is specified', async () => {
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/develop',
          stderr: '',
        }) // ls-remote
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // reset
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // checkout

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'main';

      const result = await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['clone', '--depth', '1', url, directory]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'ls-remote', '--heads', 'origin']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(3, 'git', ['-C', directory, 'reset', '--hard']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'checkout', 'main']);

      expect(result).toEqual({
        repoUrl: url,
        remoteBranch: 'main',
        filePath: undefined,
        repoOwner: 'user',
        repoName: 'repo',
      });
    });

    test('should throw error when git fetch fails', async () => {
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/develop',
          stderr: '',
        }) // ls-remote
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // reset
        .mockRejectedValueOnce(new Error('Authentication failed')); // checkout fails

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'main';

      const mockExecGitShallowClone = async (
        url: string,
        directory: string,
        remoteBranch: string,
        deps: { execFileAsync: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }> },
      ) => {
        await deps.execFileAsync('git', ['clone', '--depth', '1', url, directory]);
        const { stdout } = await deps.execFileAsync('git', ['-C', directory, 'ls-remote', '--heads', 'origin']);
        await deps.execFileAsync('git', ['-C', directory, 'reset', '--hard']);
        await deps.execFileAsync('git', ['-C', directory, 'checkout', remoteBranch]);
        return {
          repoUrl: url,
          remoteBranch,
          filePath: undefined,
          repoOwner: 'user',
          repoName: 'repo',
        };
      };

      await expect(
        mockExecGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Authentication failed');
    });

    test('should handle short SHA correctly', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const shortSha = 'ce9b621';

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/develop',
          stderr: '',
        }) // ls-remote
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // reset
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // checkout

      const result = await execGitShallowClone(url, directory, shortSha, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['clone', '--depth', '1', url, directory]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'ls-remote', '--heads', 'origin']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(3, 'git', ['-C', directory, 'reset', '--hard']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'checkout', shortSha]);

      expect(result).toEqual({
        repoUrl: url,
        remoteBranch: shortSha,
        filePath: undefined,
        repoOwner: 'user',
        repoName: 'repo',
      });
    });

    test('should handle slashed branch names correctly', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const slashedBranch = 'feature/new-feature';

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/feature/new-feature',
          stderr: '',
        }) // ls-remote
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // reset
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // checkout

      const result = await execGitShallowClone(url, directory, slashedBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['clone', '--depth', '1', url, directory]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'ls-remote', '--heads', 'origin']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(3, 'git', ['-C', directory, 'reset', '--hard']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'checkout', slashedBranch]);

      expect(result).toEqual({
        repoUrl: url,
        remoteBranch: slashedBranch,
        filePath: undefined,
        repoOwner: 'user',
        repoName: 'repo',
      });
    });

    test('should handle slashed branch names with file paths correctly', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const branchWithPath = 'feature/new-feature/path/to/file.js';

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/feature/new-feature',
          stderr: '',
        }) // ls-remote
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // reset
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // checkout

      const result = await execGitShallowClone(url, directory, branchWithPath, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['clone', '--depth', '1', url, directory]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'ls-remote', '--heads', 'origin']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(3, 'git', ['-C', directory, 'reset', '--hard']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'checkout', 'feature/new-feature']);

      expect(result).toEqual({
        repoUrl: url,
        remoteBranch: 'feature/new-feature',
        filePath: 'path/to/file.js',
        repoOwner: 'user',
        repoName: 'repo',
      });
    });

    test('should throw error when branch is not found', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const nonExistentBranch = 'non-existent-branch';

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/develop',
          stderr: '',
        }); // ls-remote

      await expect(
        execGitShallowClone(url, directory, nonExistentBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow(`Could not find branch: ${nonExistentBranch}`);
    });

    test('should throw error for invalid URL', async () => {
      const url = 'invalid-url';
      const directory = '/tmp/repo';

      await expect(
        execGitShallowClone(url, directory, undefined, { execFileAsync: vi.fn() }),
      ).rejects.toThrow('Invalid repository URL');
    });

    test('should throw error for invalid protocol', async () => {
      const url = 'ftp://github.com/user/repo.git';
      const directory = '/tmp/repo';

      await expect(
        execGitShallowClone(url, directory, undefined, { execFileAsync: vi.fn() }),
      ).rejects.toThrow('Invalid repository URL');
    });

    test('should throw error for invalid directory path', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '';

      await expect(
        execGitShallowClone(url, directory, undefined, { execFileAsync: vi.fn() }),
      ).rejects.toThrow('Invalid directory path');
    });

    test('should throw error for invalid branch name type', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const invalidBranch = 123;

      await expect(
        execGitShallowClone(url, directory, invalidBranch, { execFileAsync: vi.fn() }),
      ).rejects.toThrow('Invalid branch name');
    });

    test('should throw error when checkout fails', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const branch = 'feature/branch';

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // clone
        .mockResolvedValueOnce({
          stdout: 'abcdef1234 refs/heads/main\nabcdef5678 refs/heads/feature/branch',
          stderr: '',
        }) // ls-remote
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // reset
        .mockRejectedValueOnce(new Error('Checkout failed')); // checkout fails

      await expect(
        execGitShallowClone(url, directory, branch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Failed to checkout branch or commit');
    });

    test('should extract owner and repo name correctly from URL', async () => {
      const url = 'https://github.com/organization/repository-name.git';
      const directory = '/tmp/repo';

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // clone

      const result = await execGitShallowClone(url, directory, undefined, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual({
        repoUrl: url,
        remoteBranch: undefined,
        filePath: undefined,
        repoOwner: 'organization',
        repoName: 'repository-name',
      });
    });
  });
});
