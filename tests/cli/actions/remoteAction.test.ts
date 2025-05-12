import * as fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import * as remoteActionModule from '../../../src/cli/actions/remoteAction.js';
import {
  copyOutputToCurrentDirectory,
  isValidRemoteValue,
  parseRemoteValue,
  runRemoteAction,
} from '../../../src/cli/actions/remoteAction.js';

import { isGithubRepoUrl, parseGithubRepoUrl } from '../../../src/core/file/githubZipDownload.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    copyFile: vi.fn(),
    mkdir: vi.fn(),
    mkdtemp: vi.fn().mockImplementation((prefix) => Promise.resolve(`${prefix}test-dir`)),
    rm: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock('node:path', async () => {
  const actual = await vi.importActual<typeof import('node:path')>('node:path');
  return {
    ...actual,
    resolve: vi.fn().mockImplementation((...args) => {
      const validArgs = args.filter((arg) => arg !== undefined);
      if (validArgs.length === 0) return '/mock/path';
      return actual.resolve(...validArgs);
    }),
  };
});
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/cliSpinner');

describe('remoteAction functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('runRemoteAction', () => {
    beforeEach(() => {
      vi.spyOn(remoteActionModule, 'runRemoteAction').mockImplementation(
        async (
          repoUrl,
          cliOptions,
          deps = {
            isGitInstalled: async () => Promise.resolve(true),
            execGitShallowClone: async () => {},
            runDefaultAction: async () => {
              const mockConfig = createMockConfig();
              mockConfig.output = {
                ...mockConfig.output,
                filePath: 'output.json',
              };

              return {
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
              } satisfies DefaultActionRunnerResult;
            },
            downloadGithubRepoAsZip: async () => {},
          },
        ) => {
          if (isGithubRepoUrl(repoUrl)) {
            try {
              const { owner, repo, branch } = parseGithubRepoUrl(repoUrl);
              await deps.downloadGithubRepoAsZip(owner, repo, '/tmp', branch);
            } catch (error) {
              await deps.execGitShallowClone(repoUrl, '/tmp');
            }
          } else {
            await deps.execGitShallowClone(repoUrl, '/tmp');
          }

          const mockConfig = createMockConfig();
          mockConfig.output = {
            ...mockConfig.output,
            filePath: 'output.json',
          };

          return {
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
          };
        },
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

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
            const mockConfig = createMockConfig();
            mockConfig.output = {
              ...mockConfig.output,
              filePath: 'output.json',
            };

            return {
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
            } satisfies DefaultActionRunnerResult;
          },
          downloadGithubRepoAsZip: async () => {},
        },
      );
    });

    test('should use zip download for GitHub URLs', async () => {
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      const mockDownloadGithubRepoAsZip = vi.fn().mockResolvedValue(undefined);
      const mockExecGitShallowClone = vi.fn().mockResolvedValue(undefined);

      await runRemoteAction(
        'https://github.com/yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          runDefaultAction: async () => {
            const mockConfig = createMockConfig();
            mockConfig.output = {
              ...mockConfig.output,
              filePath: 'output.json',
            };

            return {
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
            } satisfies DefaultActionRunnerResult;
          },
          downloadGithubRepoAsZip: mockDownloadGithubRepoAsZip,
        },
      );

      expect(mockDownloadGithubRepoAsZip).toHaveBeenCalled();
      expect(mockExecGitShallowClone).not.toHaveBeenCalled();
    });

    test('should fall back to git clone if zip download fails', async () => {
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      const mockDownloadGithubRepoAsZip = vi.fn().mockRejectedValue(new Error('Download failed'));
      const mockExecGitShallowClone = vi.fn().mockResolvedValue(undefined);

      await runRemoteAction(
        'https://github.com/yamadashy/repomix',
        {},
        {
          isGitInstalled: async () => Promise.resolve(true),
          execGitShallowClone: mockExecGitShallowClone,
          runDefaultAction: async () => {
            const mockConfig = createMockConfig();
            mockConfig.output = {
              ...mockConfig.output,
              filePath: 'output.json',
            };

            return {
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
            } satisfies DefaultActionRunnerResult;
          },
          downloadGithubRepoAsZip: mockDownloadGithubRepoAsZip,
        },
      );

      expect(mockDownloadGithubRepoAsZip).toHaveBeenCalled();
      expect(mockExecGitShallowClone).toHaveBeenCalled();
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

  describe('isGithubRepoUrl', () => {
    test('should return true for GitHub URLs', () => {
      expect(isGithubRepoUrl('https://github.com/user/repo')).toBe(true);
      expect(isGithubRepoUrl('https://github.com/user/repo.git')).toBe(true);
      expect(isGithubRepoUrl('https://github.com/user/repo/tree/main')).toBe(true);
    });

    test('should return false for non-GitHub URLs', () => {
      expect(isGithubRepoUrl('https://gitlab.com/user/repo')).toBe(false);
      expect(isGithubRepoUrl('https://bitbucket.org/user/repo')).toBe(false);
      expect(isGithubRepoUrl('not-a-url')).toBe(false);
    });
  });

  describe('parseGithubRepoUrl', () => {
    test('should parse GitHub repository URLs correctly', () => {
      expect(parseGithubRepoUrl('https://github.com/user/repo')).toEqual({
        owner: 'user',
        repo: 'repo',
      });

      expect(parseGithubRepoUrl('https://github.com/user/repo.git')).toEqual({
        owner: 'user',
        repo: 'repo.git',
      });

      expect(parseGithubRepoUrl('https://github.com/user/repo/tree/main')).toEqual({
        owner: 'user',
        repo: 'repo',
        branch: 'main',
      });

      expect(parseGithubRepoUrl('https://github.com/user/repo/tree/feature-branch')).toEqual({
        owner: 'user',
        repo: 'repo',
        branch: 'feature-branch',
      });
    });

    test('should throw an error for non-GitHub URLs', () => {
      expect(() => parseGithubRepoUrl('https://gitlab.com/user/repo')).toThrow('Not a GitHub repository URL');
    });

    test('should throw an error for invalid GitHub URLs', () => {
      expect(() => parseGithubRepoUrl('https://github.com/')).toThrow('Invalid GitHub repository URL');
      expect(() => parseGithubRepoUrl('https://github.com/user')).toThrow('Invalid GitHub repository URL');
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
