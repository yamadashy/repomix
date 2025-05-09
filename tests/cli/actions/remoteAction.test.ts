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

vi.mock('node:fs/promises', async () => {
  return {
    copyFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
    mkdtemp: vi.fn().mockResolvedValue('/tmp/repomix-test'),
  };
});
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/cliSpinner');

describe('remoteAction functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runRemoteAction', () => {
    test('should clone the repository', async () => {
      const mockTempDir = '/tmp/repomix-test';
      vi.mocked(fs.mkdtemp).mockResolvedValue(mockTempDir);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.rm).mockResolvedValue(undefined);

      const mockConfig = createMockConfig();
      mockConfig.output.filePath = 'output.md';

      const mockDeps = {
        isGitInstalled: vi.fn().mockResolvedValue(true),
        execGitShallowClone: vi.fn().mockImplementation(async (url, dir) => {
          await fs.writeFile(path.join(dir, 'README.md'), 'Test content');
          return {
            repoUrl: url,
            remoteBranch: undefined,
            filePath: undefined,
            repoOwner: 'yamadashy',
            repoName: 'repomix',
          };
        }),
        runDefaultAction: vi.fn().mockResolvedValue({
          packResult: {
            totalFiles: 1,
            totalCharacters: 1,
            totalTokens: 1,
            fileCharCounts: {},
            fileTokenCounts: {},
            suspiciousFilesResults: [],
          suspiciousGitDiffResults: [],
          gitDiffTokenCount: 0,
          },
          config: mockConfig,
        }),
      };

      await runRemoteAction('yamadashy/repomix', {}, mockDeps);

      expect(mockDeps.isGitInstalled).toHaveBeenCalled();
      expect(mockDeps.execGitShallowClone).toHaveBeenCalled();

      expect(mockDeps.runDefaultAction).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalled();
      expect(fs.rm).toHaveBeenCalledWith(mockTempDir, expect.any(Object));
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
      expect(parseRemoteValue('user_name/repo_name')).toEqual({
        repoUrl: 'https://github.com/user_name/repo_name.git',
        remoteBranch: undefined,
      });
      expect(parseRemoteValue('a.b/a-b_c')).toEqual({
        repoUrl: 'https://github.com/a.b/a-b_c.git',
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
      expect(
        parseRemoteValue('https://some.gitlab.domain/some/path/username/repo/-/tree/branchname/withslash'),
      ).toEqual({
        repoUrl: 'https://some.gitlab.domain/some/path/username/repo.git',
        remoteBranch: 'branchname/withslash',
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
    test('should throw when the URL is invalid or harmful', () => {
      expect(() => parseRemoteValue('some random string')).toThrowError();
    });
  });

  describe('copyOutputToCurrentDirectory', () => {
    test('should copy output file', async () => {
      const sourceDir = '/source/dir';
      const targetDir = '/target/dir';
      const fileName = 'output.txt';

      vi.mocked(fs.copyFile).mockResolvedValue();

      await copyOutputToCurrentDirectory(sourceDir, targetDir, fileName);

      expect(fs.copyFile).toHaveBeenCalledWith(path.resolve(sourceDir, fileName), path.resolve(targetDir, fileName));
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
