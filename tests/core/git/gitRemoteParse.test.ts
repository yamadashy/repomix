import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  isExplicitRemoteUrl,
  isGitHubRepository,
  parseGitHubRepoInfo,
  parseRemoteValue,
} from '../../../src/core/git/gitRemoteParse.js';
import { isValidRemoteValue } from '../../../src/index.js';

vi.mock('../../../src/shared/logger');

describe('remoteAction functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

    test('should handle Azure DevOps SSH URLs', () => {
      const azureDevOpsUrl = 'git@ssh.dev.azure.com:v3/organization/project/repo';
      const parsed = parseRemoteValue(azureDevOpsUrl);
      expect(parsed).toEqual({
        repoUrl: azureDevOpsUrl,
        remoteBranch: undefined,
      });
    });

    test('should handle Azure DevOps HTTPS URLs', () => {
      const azureDevOpsUrl = 'https://dev.azure.com/organization/project/_git/repo';
      const parsed = parseRemoteValue(azureDevOpsUrl);
      expect(parsed).toEqual({
        repoUrl: azureDevOpsUrl,
        remoteBranch: undefined,
      });
    });

    test('should handle legacy Visual Studio Team Services URLs', () => {
      const vstsUrl = 'https://myorg.visualstudio.com/myproject/_git/myrepo';
      const parsed = parseRemoteValue(vstsUrl);
      expect(parsed).toEqual({
        repoUrl: vstsUrl,
        remoteBranch: undefined,
      });
    });

    test('should not treat URLs with Azure DevOps hostnames in path as Azure DevOps URLs', () => {
      // Security test: Ensure URLs with Azure DevOps keywords in the path are not treated as Azure DevOps
      const maliciousUrl = 'https://evil.com/dev.azure.com/fake/repo';
      const parsed = parseRemoteValue(maliciousUrl);
      // Should be parsed normally (not as Azure DevOps), with .git suffix added
      expect(parsed.repoUrl).toBe('https://evil.com/dev.azure.com/fake/repo.git');
    });

    test('should not treat URLs with visualstudio.com in path as Azure DevOps URLs', () => {
      const maliciousUrl = 'https://evil.com/path/visualstudio.com/fake/repo';
      const parsed = parseRemoteValue(maliciousUrl);
      // Should be parsed normally (not as Azure DevOps), with .git suffix added
      expect(parsed.repoUrl).toBe('https://evil.com/path/visualstudio.com/fake/repo.git');
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
        parseRemoteValue('https://some.gitlab.domain/some/path/username/repo/-/tree/branchname/withslash', [
          'branchname/withslash',
        ]),
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

  describe('parseGitHubRepoInfo', () => {
    test('should parse GitHub shorthand', () => {
      const result = parseGitHubRepoInfo('yamadashy/repomix');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
      });
    });

    test('should parse GitHub URL with branch', () => {
      const result = parseGitHubRepoInfo('https://github.com/yamadashy/repomix/tree/develop');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
        ref: 'develop',
      });
    });

    test('should parse GitHub git URL', () => {
      const result = parseGitHubRepoInfo('https://github.com/yamadashy/repomix.git');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
      });
    });

    test('should return null for non-GitHub URLs', () => {
      const result = parseGitHubRepoInfo('https://gitlab.com/user/repo');
      expect(result).toBeNull();
    });

    test('should return null for invalid URLs', () => {
      const result = parseGitHubRepoInfo('invalid-url');
      expect(result).toBeNull();
    });

    test('should handle git@ URLs', () => {
      const result = parseGitHubRepoInfo('git@github.com:yamadashy/repomix.git');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
      });
    });

    test('should merge branch from parsing when URL contains branch info', () => {
      const result = parseGitHubRepoInfo('https://github.com/yamadashy/repomix/tree/feature/test');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
        ref: 'feature/test',
      });
    });

    test('should reject malicious URLs with github.com in path or query', () => {
      // Malicious URLs that should not be treated as GitHub repositories
      expect(parseGitHubRepoInfo('https://evil.com/github.com/user/repo')).toBeNull();
      expect(parseGitHubRepoInfo('https://evil.com/?redirect=github.com/user/repo')).toBeNull();
      expect(parseGitHubRepoInfo('https://evil.com#github.com/user/repo')).toBeNull();
      expect(parseGitHubRepoInfo('https://github.com.evil.com/user/repo')).toBeNull();
    });

    test('should accept legitimate GitHub URLs', () => {
      expect(parseGitHubRepoInfo('https://github.com/user/repo')).not.toBeNull();
      expect(parseGitHubRepoInfo('https://www.github.com/user/repo')).not.toBeNull();
    });
  });

  describe('isExplicitRemoteUrl', () => {
    test('should return true for HTTPS URLs', () => {
      expect(isExplicitRemoteUrl('https://github.com/user/repo')).toBe(true);
      expect(isExplicitRemoteUrl('https://gitlab.com/user/repo')).toBe(true);
      expect(isExplicitRemoteUrl('https://bitbucket.org/user/repo')).toBe(true);
    });

    test('should return true for git@ SSH URLs', () => {
      expect(isExplicitRemoteUrl('git@github.com:user/repo.git')).toBe(true);
      expect(isExplicitRemoteUrl('git@gitlab.com:user/repo.git')).toBe(true);
      expect(isExplicitRemoteUrl('git@ssh.dev.azure.com:v3/org/project/repo')).toBe(true);
    });

    test('should return true for ssh:// URLs', () => {
      expect(isExplicitRemoteUrl('ssh://git@github.com/user/repo.git')).toBe(true);
      expect(isExplicitRemoteUrl('ssh://git@gitlab.com/user/repo.git')).toBe(true);
    });

    test('should return true for git:// URLs', () => {
      expect(isExplicitRemoteUrl('git://github.com/user/repo.git')).toBe(true);
      expect(isExplicitRemoteUrl('git://gitlab.com/user/repo.git')).toBe(true);
    });

    test('should return false for shorthand format', () => {
      expect(isExplicitRemoteUrl('user/repo')).toBe(false);
      expect(isExplicitRemoteUrl('yamadashy/repomix')).toBe(false);
    });

    test('should return false for local paths', () => {
      expect(isExplicitRemoteUrl('.')).toBe(false);
      expect(isExplicitRemoteUrl('./src')).toBe(false);
      expect(isExplicitRemoteUrl('/absolute/path')).toBe(false);
      expect(isExplicitRemoteUrl('relative/path')).toBe(false);
    });

    test('should return false for http:// URLs', () => {
      expect(isExplicitRemoteUrl('http://example.com/repo')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isExplicitRemoteUrl('')).toBe(false);
    });
  });

  describe('isGitHubRepository', () => {
    test('should return true for GitHub repositories', () => {
      expect(isGitHubRepository('yamadashy/repomix')).toBe(true);
      expect(isGitHubRepository('https://github.com/yamadashy/repomix')).toBe(true);
      expect(isGitHubRepository('git@github.com:yamadashy/repomix.git')).toBe(true);
      expect(isGitHubRepository('https://github.com/yamadashy/repomix/tree/develop')).toBe(true);
    });

    test('should return false for non-GitHub repositories', () => {
      expect(isGitHubRepository('https://gitlab.com/user/repo')).toBe(false);
      expect(isGitHubRepository('https://bitbucket.org/user/repo')).toBe(false);
      expect(isGitHubRepository('invalid-url')).toBe(false);
      expect(isGitHubRepository('')).toBe(false);
    });
  });
});
