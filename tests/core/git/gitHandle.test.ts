import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getDiff, isGitRepository, validateGitUrl } from '../../../src/core/git/gitHandle.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('../../../src/shared/logger');

describe('gitHandle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  describe('getDiff', () => {
    test('should return diffs when directory is a git repository', async () => {
      const mockDiff =
        'diff --git a/file.txt b/file.txt\nindex 1234..5678 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1,5 +1,5 @@\n-old line\n+new line';
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'true', stderr: '' }) // isGitRepository
        .mockResolvedValueOnce({ stdout: mockDiff, stderr: '' }); // git diff

      const directory = '/test/dir';
      const options = ['--option1', '--option2'];
      const result = await getDiff(directory, options, { execFileAsync: mockFileExecAsync });

      expect(result).toBe(mockDiff);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(1, 'git', [
        '-C',
        directory,
        'rev-parse',
        '--is-inside-work-tree',
      ]);
      expect(mockFileExecAsync).toHaveBeenNthCalledWith(2, 'git', ['-C', directory, 'diff', '--no-color', ...options]);
    });

    test('should return empty string when directory is not a git repository', async () => {
      const mockFileExecAsync = vi.fn().mockRejectedValue(new Error('Not a git repository'));
      const directory = '/test/dir';
      const options: string[] = [];

      const result = await getDiff(directory, options, { execFileAsync: mockFileExecAsync });

      expect(result).toBe('');
      expect(mockFileExecAsync).toHaveBeenCalledWith('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    });

    test('should return empty string when git diff command fails', async () => {
      const mockFileExecAsync = vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'true', stderr: '' }) // isGitRepository success
        .mockRejectedValueOnce(new Error('Failed to get diff')); // git diff failure

      const directory = '/test/dir';
      const options: string[] = [];
      const result = await getDiff(directory, options, { execFileAsync: mockFileExecAsync });

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

  describe('validateGitUrl', () => {
    test('should reject URLs with dangerous parameters', () => {
      const url = 'https://github.com/user/repo.git --upload-pack=evil-command';

      expect(() => validateGitUrl(url)).toThrow(
        'Invalid repository URL. URL contains potentially dangerous parameters',
      );
    });

    test('should reject URLs with invalid protocol', () => {
      const url = 'invalid-url';

      expect(() => validateGitUrl(url)).toThrow(
        "Invalid URL protocol for 'invalid-url'. URL must start with 'git@' or 'https://'",
      );
    });

    test('should reject invalid https URLs', () => {
      const url = 'https://invalid url with spaces';

      expect(() => validateGitUrl(url)).toThrow('Invalid repository URL. Please provide a valid URL');
    });

    test('should accept valid git@ URLs', () => {
      const url = 'git@github.com:user/repo.git';

      expect(() => validateGitUrl(url)).not.toThrow();
    });

    test('should accept valid https:// URLs', () => {
      const url = 'https://github.com/user/repo.git';

      expect(() => validateGitUrl(url)).not.toThrow();
    });
  });
});
