import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getRemoteRefs } from '../../../src/core/git/getRemoteRefs.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');
vi.mock('../../../src/core/git/gitHandle.js', () => ({
  validateGitUrl: vi.fn(),
}));

describe('getRemoteRefs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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

  test('should throw error when git command fails', async () => {
    const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('git command failed'));

    await expect(
      getRemoteRefs('https://github.com/user/repo.git', { execFileAsync: mockFileExecAsync }),
    ).rejects.toThrow('Failed to get remote refs: git command failed');

    expect(mockFileExecAsync).toHaveBeenCalledWith('git', [
      'ls-remote',
      '--heads',
      '--tags',
      'https://github.com/user/repo.git',
    ]);
  });
});
