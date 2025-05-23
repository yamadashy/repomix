import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  execGitShallowClone,
  getFileChangeCount,
  getRemoteRefs,
  getWorkTreeDiff,
  isGitInstalled,
  isGitRepository,
} from '../../../src/core/git/gitCommand.js';
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
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'main';

      await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'remote', 'add', 'origin', url]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(3, 'git', [
        '-C',
        directory,
        'fetch',
        '--depth',
        '1',
        'origin',
        remoteBranch,
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'checkout', 'FETCH_HEAD']);
    });

    test('should throw error when git fetch fails', async () => {
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce('Success on first call')
        .mockResolvedValueOnce('Success on second call')
        .mockRejectedValueOnce(new Error('Authentication failed'));

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'b188a6cb39b512a9c6da7235b880af42c78ccd0d';

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Authentication failed');
      expect(mockFileExecAsync).toHaveBeenCalledTimes(3);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'remote', 'add', 'origin', url]);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith('git', [
        '-C',
        directory,
        'fetch',
        '--depth',
        '1',
        'origin',
        remoteBranch,
      ]);
    });

    test('should handle short SHA correctly', async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const shortSha = 'ce9b621';
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce('Success on first call')
        .mockResolvedValueOnce('Success on second call')
        .mockRejectedValueOnce(
          new Error(
            `Command failed: git fetch --depth 1 origin ${shortSha}\nfatal: couldn't find remote ref ${shortSha}`,
          ),
        );

      await execGitShallowClone(url, directory, shortSha, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(5);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'remote', 'add', 'origin', url]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(3, 'git', [
        '-C',
        directory,
        'fetch',
        '--depth',
        '1',
        'origin',
        shortSha,
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(4, 'git', ['-C', directory, 'fetch', 'origin']);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith('git', ['-C', directory, 'checkout', shortSha]);
    });

    test("should throw error when remote ref is not found, and it's not due to short SHA", async () => {
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'b188a6cb39b512a9c6da7235b880af42c78ccd0d';
      const errMessage = `Command failed: git fetch --depth 1 origin ${remoteBranch}\nfatal: couldn't find remote ref ${remoteBranch}`;

      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce('Success on first call')
        .mockResolvedValueOnce('Success on second call')
        .mockRejectedValueOnce(new Error(errMessage));

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow(errMessage);
      expect(mockFileExecAsync).toHaveBeenCalledTimes(3);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'remote', 'add', 'origin', url]);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith('git', [
        '-C',
        directory,
        'fetch',
        '--depth',
        '1',
        'origin',
        remoteBranch,
      ]);
    });
  });

  test('should reject URLs with dangerous parameters', async () => {
    const mockFileExecAsync = vi.fn();

    const url = 'https://github.com/user/repo.git --upload-pack=evil-command';
    const directory = '/tmp/repo';
    const remoteBranch = undefined;

    await expect(
      execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
    ).rejects.toThrow('Invalid repository URL. URL contains potentially dangerous parameters');

    expect(mockFileExecAsync).not.toHaveBeenCalled();
  });

  describe('getRemoteRefs', () => {
    test('should return refs when URL is valid', async () => {
      const mockOutput = `
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\trefs/heads/main
b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7\trefs/heads/develop
c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8\trefs/tags/v1.0.0
`.trim();
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await getRemoteRefs('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync });

      expect(result).toEqual(['main', 'develop', 'v1.0.0']);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        'ls-remote',
        '--heads',
        '--tags',
        'https://github.com/user/repo.git',
      ]);
    });

    test('should throw error when URL does not start with git@ or https://', async () => {
      const mockFileExecAsync = vi.fn();

      await expect(getRemoteRefs('invalid-url', { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'Invalid remote: invalid-url',
      );

      expect(mockFileExecAsync).not.toHaveBeenCalled();
    });

    test('should throw error when URL contains dangerous parameters', async () => {
      const mockFileExecAsync = vi.fn();

      await expect(
        getRemoteRefs('https://github.com/user/repo.git --upload-pack=evil-command', { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Invalid repository URL. URL contains potentially dangerous parameters');

      expect(mockFileExecAsync).not.toHaveBeenCalled();
    });

    test('should throw error when git command fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(getRemoteRefs('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'Failed to get remote refs: git command failed',
      );

      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        'ls-remote',
        '--heads',
        '--tags',
        'https://github.com/user/repo.git',
      ]);
    });
  });
});
