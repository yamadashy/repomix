import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  execGitDiff,
  execGitLog,
  execGitLogFilenames,
  execGitRevParse,
  execGitShallowClone,
  execGitVersion,
  execLsRemote,
} from '../../../src/core/git/gitCommand.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

const expectGitRemoteOpts = expect.objectContaining({
  timeout: 30000,
  env: expect.objectContaining({ GIT_TERMINAL_PROMPT: '0' }),
});

describe('gitCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('execGitLogFilenames', () => {
    test('should return filenames from git log', async () => {
      const mockOutput = `
file1.ts
file2.ts
file1.ts
file3.ts
file2.ts
`.trim();
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLogFilenames('/test/dir', 5, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual(['file1.ts', 'file2.ts', 'file1.ts', 'file3.ts', 'file2.ts']);
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

    test('should return empty array when git command fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      const result = await execGitLogFilenames('/test/dir', 5, { execFileAsync: mockFileExecAsync });

      expect(result).toEqual([]);
      expect(logger.trace).toHaveBeenCalledWith('Failed to get git log filenames:', 'git command failed');
    });
  });

  describe('execGitDiff', () => {
    test('should return git diff output', async () => {
      const mockDiff = 'diff --git a/file.txt b/file.txt\n+new line';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockDiff });

      const result = await execGitDiff('/test/dir', [], { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockDiff);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', '/test/dir', 'diff', '--no-color']);
    });

    test('should throw error when git diff fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(execGitDiff('/test/dir', [], { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'git command failed',
      );
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git diff:', 'git command failed');
    });
  });

  describe('execGitVersion', () => {
    test('should return git version output', async () => {
      const mockVersion = 'git version 2.34.1';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockVersion });

      const result = await execGitVersion({ execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockVersion);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['--version']);
    });

    test('should throw error when git version fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Command not found: git'));

      await expect(execGitVersion({ execFileAsync: mockFileExecAsync })).rejects.toThrow('Command not found: git');
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git version:', 'Command not found: git');
    });
  });

  describe('execGitRevParse', () => {
    test('should return git rev-parse output', async () => {
      const mockOutput = 'true';
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitRevParse('/test/dir', { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', '/test/dir', 'rev-parse', '--is-inside-work-tree']);
    });

    test('should throw error when git rev-parse fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Not a git repository'));

      await expect(execGitRevParse('/test/dir', { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'Not a git repository',
      );
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git rev-parse:', 'Not a git repository');
    });
  });

  describe('execGitShallowClone', () => {
    test('should execute without branch option if not specified by user', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth', '1', '--', url, directory],
        expectGitRemoteOpts,
      );
    });

    test('should throw error when git clone fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Authentication failed');

      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['clone', '--depth', '1', '--', url, directory],
        expectGitRemoteOpts,
      );
    });

    test('should execute commands correctly when branch is specified', async () => {
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

      const url = 'https://github.com/user/repo.git';
      const directory = '/tmp/repo';
      const remoteBranch = 'main';

      await execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync });

      expect(mockFileExecAsync).toHaveBeenCalledTimes(4);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', ['-C', directory, 'init']);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(
        3,
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', remoteBranch],
        expectGitRemoteOpts,
      );
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
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith(
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', remoteBranch],
        expectGitRemoteOpts,
      );
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
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(
        3,
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', shortSha],
        expectGitRemoteOpts,
      );
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(
        4,
        'git',
        ['-C', directory, 'fetch', 'origin'],
        expectGitRemoteOpts,
      );
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
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', [
        '-C',
        directory,
        'remote',
        'add',
        '--',
        'origin',
        url,
      ]);
      expect(mockFileExecAsync).toHaveBeenLastCalledWith(
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', remoteBranch],
        expectGitRemoteOpts,
      );
    });
  });

  describe('execGitLog', () => {
    test('should return git log with null character separator', async () => {
      const mockOutput = `\x002024-01-01 10:00:00 +0900|Initial commit
file1.txt
file2.txt
\x002024-01-02 11:00:00 +0900|Add new feature
src/feature.ts
test/feature.test.ts`;
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLog('/test/dir', 10, '%x00', { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'log',
        '--pretty=format:%x00%ad|%s',
        '--date=iso',
        '--name-only',
        '-n',
        '10',
      ]);
    });

    test('should use custom record separator when provided', async () => {
      const customSeparator = '|SEPARATOR|';
      const mockOutput = `${customSeparator}2024-01-01 10:00:00 +0900|Initial commit
file1.txt`;
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLog('/test/dir', 5, customSeparator, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'log',
        `--pretty=format:${customSeparator}%ad|%s`,
        '--date=iso',
        '--name-only',
        '-n',
        '5',
      ]);
    });

    test('should throw error when git log fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(execGitLog('/test/dir', 10, '%x00', { execFileAsync: mockFileExecAsync })).rejects.toThrow(
        'git command failed',
      );
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git log:', 'git command failed');
    });

    test('should work with different separators', async () => {
      const separator = '###';
      const mockOutput = `${separator}2024-01-01 10:00:00 +0900|Test commit
file.txt`;
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execGitLog('/test/dir', 50, separator, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
        '-C',
        '/test/dir',
        'log',
        `--pretty=format:${separator}%ad|%s`,
        '--date=iso',
        '--name-only',
        '-n',
        '50',
      ]);
    });
  });

  describe('validateGitUrl security checks', () => {
    test.each([
      ['--upload-pack', 'https://github.com/user/repo.git --upload-pack=evil-command'],
      ['--receive-pack', 'https://github.com/user/repo.git --receive-pack=evil-command'],
      ['--config', 'https://github.com/user/repo.git --config=core.sshCommand=evil-command'],
      ['--exec', 'https://github.com/user/repo.git --exec=evil-command'],
    ])('should reject URLs with %s parameter', async (_param, url) => {
      const mockFileExecAsync = vi.fn();
      const directory = '/tmp/repo';
      const remoteBranch = undefined;

      await expect(
        execGitShallowClone(url, directory, remoteBranch, { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('Invalid repository URL. URL contains potentially dangerous parameters');

      expect(mockFileExecAsync).not.toHaveBeenCalled();
    });
  });

  describe('execLsRemote', () => {
    test('should return git ls-remote output', async () => {
      const mockOutput = `
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\trefs/heads/main
b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7\trefs/heads/develop
c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8\trefs/tags/v1.0.0
`.trim();
      const mockFileExecAsync = vi.fn().mockResolvedValue({ stdout: mockOutput });

      const result = await execLsRemote('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockOutput);
      expect(mockFileExecAsync).toHaveBeenCalledWith(
        'git',
        ['ls-remote', '--heads', '--tags', '--', 'https://github.com/user/repo.git'],
        expectGitRemoteOpts,
      );
    });

    test('should throw error when git ls-remote fails', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

      await expect(
        execLsRemote('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync }),
      ).rejects.toThrow('git command failed');
      expect(logger.trace).toHaveBeenCalledWith('Failed to execute git ls-remote:', 'git command failed');
    });
  });
});
