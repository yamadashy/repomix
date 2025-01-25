import * as fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import {
  copyOutputToCurrentDirectory,
  formatRemoteValueToUrl,
  isValidRemoteValue,
  runRemoteAction,
} from '../../../src/cli/actions/remoteAction.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    copyFile: vi.fn(),
  };
});
vi.mock('../../../src/shared/logger');

describe('remoteAction functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runRemoteAction', () => {
    test('should clone the repository', async () => {
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: async (url: string, directory: string) => {
            await fs.writeFile(path.join(directory, 'README.md'), 'Hello, world!');
          },
          runDefaultAction: async () => {
            return {
              packResult: {
                totalFiles: 1,
                totalCharacters: 1,
                totalTokens: 1,
                fileCharCounts: {},
                fileTokenCounts: {},
                suspiciousFilesResults: [],
              },
              config: createMockConfig(),
            } satisfies DefaultActionRunnerResult;
          },
        },
      );
    });
  });

  describe('formatGitUrl', () => {
    test('should convert GitHub shorthand to full URL', () => {
      expect(formatRemoteValueToUrl('user/repo')).toBe('https://github.com/user/repo.git');
      expect(formatRemoteValueToUrl('user-name/repo-name')).toBe('https://github.com/user-name/repo-name.git');
      expect(formatRemoteValueToUrl('user_name/repo_name')).toBe('https://github.com/user_name/repo_name.git');
      expect(formatRemoteValueToUrl('a.b/a-b_c')).toBe('https://github.com/a.b/a-b_c.git');
    });

    test('should handle HTTPS URLs', () => {
      expect(formatRemoteValueToUrl('https://github.com/user/repo')).toBe('https://github.com/user/repo.git');
      expect(formatRemoteValueToUrl('https://github.com/user/repo.git')).toBe('https://github.com/user/repo.git');
    });

    test('should not modify SSH URLs', () => {
      const sshUrl = 'git@github.com:user/repo.git';
      expect(formatRemoteValueToUrl(sshUrl)).toBe(sshUrl);
    });
  });

  describe('copyOutputToCurrentDirectory', () => {
    test('should copy output file', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockResolvedValue();

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(fs.copyFile).toHaveBeenCalledWith(path.join(sourceDir, fileName), path.join(targetDir, fileName));
    });

    test('should throw error when copy fails', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockRejectedValue(new Error('Permission denied'));

      await expect(copyOutputToCurrentDirectory(sourceDir, targetDir, fileName)).rejects.toThrow(
        'Failed to copy output file',
      );
    });
  });

  describe('isValidRemoteValue', () => {
    describe('GitHub shorthand format (user/repo)', () => {
      test('should accept valid repository names', () => {
        // Test cases for valid repository names with various allowed characters
        const validUrls = [
          'user/repo',
          'user123/repo-name',
          'org-name/repo_name',
          'user.name/repo.test',
          'user_name/repo_test',
          'a/b', // Minimum length case
          'user-name123/repo-test123.sub_123', // Complex case
        ];

        for (const url of validUrls) {
          expect(isValidRemoteValue(url), `URL should be valid: ${url}`).toBe(true);
        }
      });

      test('should reject invalid repository names', () => {
        // Test cases for invalid patterns and disallowed characters
        const invalidUrls = [
          '', // Empty string
          'user', // Missing slash
          '/repo', // Missing username
          'user/', // Missing repository name
          '-user/repo', // Starts with hyphen
          'user/-repo', // Repository starts with hyphen
          'user./repo', // Username ends with dot
          'user/repo.', // Repository ends with dot
          'user/repo#branch', // Contains invalid character
          'user/repo/extra', // Extra path segment
          'us!er/repo', // Contains invalid character
          'user/re*po', // Contains invalid character
          'user//repo', // Double slash
          '.user/repo', // Starts with dot
          'user/.repo', // Repository starts with dot
        ];

        for (const url of invalidUrls) {
          expect(isValidRemoteValue(url), `URL should be invalid: ${url}`).toBe(false);
        }
      });
    });

    describe('Full URL format', () => {
      test('should accept valid URLs', () => {
        // Test cases for standard URL formats
        const validUrls = [
          'https://example.com',
          'http://localhost',
          'https://github.com/user/repo',
          'https://gitlab.com/user/repo',
          'https://domain.com/path/to/something',
        ];

        for (const url of validUrls) {
          expect(isValidRemoteValue(url), `URL should be valid: ${url}`).toBe(true);
        }
      });

      test('should reject invalid URLs', () => {
        // Test cases for malformed URLs
        const invalidUrls = ['not-a-url', 'http://', 'https://', '://no-protocol.com', 'http://[invalid]'];

        for (const url of invalidUrls) {
          expect(isValidRemoteValue(url), `URL should be invalid: ${url}`).toBe(false);
        }
      });
    });
  });
});
