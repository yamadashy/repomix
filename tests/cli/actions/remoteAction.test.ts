import * as fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import {
  copyOutputToCurrentDirectory,
  isValidRemoteValue,
  parseRemoteValue,
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

describe('remoteAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runRemoteAction', () => {
    const mockDefaultActionResult: DefaultActionRunnerResult = {
      packResult: {
        totalFiles: 1,
        totalCharacters: 1,
        totalTokens: 1,
        fileCharCounts: {},
        fileTokenCounts: {},
        suspiciousFilesResults: [],
      },
      config: createMockConfig(),
    };

    test('should try zip download for GitHub shorthand format', async () => {
      const mockDownloadGitHubZip = vi.fn().mockResolvedValue(undefined);
      const mockExecGitShallowClone = vi.fn();
      vi.mocked(fs.copyFile).mockResolvedValue();

      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          downloadGitHubZip: mockDownloadGitHubZip,
          runDefaultAction: async () => mockDefaultActionResult,
          isGitHubUrlOrShorthand: () => true,
        },
      );

      expect(mockDownloadGitHubZip).toHaveBeenCalledWith('yamadashy/repomix', expect.any(String), undefined);
      expect(mockExecGitShallowClone).not.toHaveBeenCalled();
    });

    test('should try zip download for GitHub URL', async () => {
      const mockDownloadGitHubZip = vi.fn().mockResolvedValue(undefined);
      const mockExecGitShallowClone = vi.fn();
      vi.mocked(fs.copyFile).mockResolvedValue();

      await runRemoteAction(
        'https://github.com/yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          downloadGitHubZip: mockDownloadGitHubZip,
          runDefaultAction: async () => mockDefaultActionResult,
          isGitHubUrlOrShorthand: () => true,
        },
      );

      expect(mockDownloadGitHubZip).toHaveBeenCalledWith(
        'https://github.com/yamadashy/repomix',
        expect.any(String),
        undefined,
      );
      expect(mockExecGitShallowClone).not.toHaveBeenCalled();
    });

    test('should fallback to git clone when zip download fails', async () => {
      const mockDownloadGitHubZip = vi.fn().mockRejectedValue(new Error('Download failed'));
      const mockExecGitShallowClone = vi.fn();
      vi.mocked(fs.copyFile).mockResolvedValue();

      await runRemoteAction(
        'yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          downloadGitHubZip: mockDownloadGitHubZip,
          runDefaultAction: async () => mockDefaultActionResult,
          isGitHubUrlOrShorthand: () => true,
        },
      );

      expect(mockDownloadGitHubZip).toHaveBeenCalled();
      expect(mockExecGitShallowClone).toHaveBeenCalled();
    });

    test('should use git clone directly for non-GitHub URLs', async () => {
      const mockDownloadGitHubZip = vi.fn();
      const mockExecGitShallowClone = vi.fn();
      vi.mocked(fs.copyFile).mockResolvedValue();

      await runRemoteAction(
        'https://gitlab.com/user/repo',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          downloadGitHubZip: mockDownloadGitHubZip,
          runDefaultAction: async () => mockDefaultActionResult,
          isGitHubUrlOrShorthand: () => false,
        },
      );

      expect(mockDownloadGitHubZip).not.toHaveBeenCalled();
      expect(mockExecGitShallowClone).toHaveBeenCalled();
    });

    test('should use specified branch for download', async () => {
      const mockDownloadGitHubZip = vi.fn().mockResolvedValue(undefined);
      const mockExecGitShallowClone = vi.fn();
      vi.mocked(fs.copyFile).mockResolvedValue();

      await runRemoteAction(
        'yamadashy/repomix',
        { remoteBranch: 'develop' },
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          downloadGitHubZip: mockDownloadGitHubZip,
          runDefaultAction: async () => mockDefaultActionResult,
          isGitHubUrlOrShorthand: () => true,
        },
      );

      expect(mockDownloadGitHubZip).toHaveBeenCalledWith('yamadashy/repomix', expect.any(String), 'develop');
    });

    test('should throw error if git is not installed', async () => {
      await expect(
        runRemoteAction(
          'yamadashy/repomix',
          {},
          {
            isGitInstalled: async () => Promise.resolve(false),
            execGitShallowClone: vi.fn(),
            downloadGitHubZip: vi.fn(),
            runDefaultAction: async () => mockDefaultActionResult,
            isGitHubUrlOrShorthand: () => true,
          },
        ),
      ).rejects.toThrow('Git is not installed');
    });
  });

  describe('parseRemoteValue', () => {
    test('should convert GitHub shorthand to full URL', () => {
      expect(parseRemoteValue('user/repo')).toEqual({
        repoUrl: 'https://github.com/user/repo.git',
        remoteBranch: undefined,
      });
      expect(parseRemoteValue('user-name/repo-name')).toEqual({
        repoUrl: 'https://github.com/user-name/repo-name.git',
        remoteBranch: undefined,
      });
    });

    test('should handle HTTPS URLs', () => {
      expect(parseRemoteValue('https://github.com/user/repo')).toEqual({
        repoUrl: 'https://github.com/user/repo.git',
        remoteBranch: undefined,
      });
      expect(parseRemoteValue('https://github.com/user/repo.git')).toEqual({
        repoUrl: 'https://github.com/user/repo.git',
        remoteBranch: undefined,
      });
    });

    test('should not modify SSH URLs', () => {
      const sshUrl = 'git@github.com:user/repo.git';
      const parsed = parseRemoteValue(sshUrl);
      expect(parsed).toEqual({
        repoUrl: sshUrl,
        remoteBranch: undefined,
      });
    });

    test('should get correct branch name from url', () => {
      expect(parseRemoteValue('https://github.com/username/repo/tree/branchname')).toEqual({
        repoUrl: 'https://github.com/username/repo.git',
        remoteBranch: 'branchname',
      });
      expect(parseRemoteValue('https://some.gitlab.domain/some/path/username/repo/-/tree/branchname')).toEqual({
        repoUrl: 'https://some.gitlab.domain/some/path/username/repo.git',
        remoteBranch: 'branchname',
      });
    });

    test('should get correct commit hash from url', () => {
      expect(
        parseRemoteValue(
          'https://some.gitlab.domain/some/path/username/repo/commit/c482755296cce46e58f87d50f25f545c5d15be6f',
        ),
      ).toEqual({
        repoUrl: 'https://some.gitlab.domain/some/path/username/repo.git',
        remoteBranch: 'c482755296cce46e58f87d50f25f545c5d15be6f',
      });
    });

    test('should throw when the URL is invalid', () => {
      expect(() => parseRemoteValue('some random string')).toThrow();
    });
  });

  describe('isValidRemoteValue', () => {
    test('should return true for valid URLs and shorthand', () => {
      expect(isValidRemoteValue('user/repo')).toBe(true);
      expect(isValidRemoteValue('https://github.com/user/repo')).toBe(true);
      expect(isValidRemoteValue('git@github.com:user/repo.git')).toBe(true);
    });

    test('should return false for invalid values', () => {
      expect(isValidRemoteValue('invalid')).toBe(false);
      expect(isValidRemoteValue('user/')).toBe(false);
      expect(isValidRemoteValue('/repo')).toBe(false);
    });

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
});
