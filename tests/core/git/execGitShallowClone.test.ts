import { beforeEach, describe, expect, test, vi } from 'vitest';
import { execGitShallowClone } from '../../../src/core/git/execGitShallowClone.js';

vi.mock('node:fs/promises', async () => {
  return {
    default: {
      rm: vi.fn().mockResolvedValue(undefined),
    },
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../../src/core/git/gitHandle.js', () => ({
  validateGitUrl: vi.fn(),
}));

describe('execGitShallowClone', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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
