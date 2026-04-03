import { describe, expect, test } from 'vitest';
import {
  buildGitHubArchiveUrl,
  buildGitHubMasterArchiveUrl,
  buildGitHubTagArchiveUrl,
  checkGitHubResponse,
} from '../../../src/core/git/gitHubArchiveApi.js';
import { parseGitHubRepoInfo } from '../../../src/core/git/gitRemoteParse.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

describe('GitHub Archive API', () => {
  describe('buildGitHubArchiveUrl', () => {
    test('should build URL for default branch (HEAD)', () => {
      const repoInfo = { owner: 'user', repo: 'repo' };
      const url = buildGitHubArchiveUrl(repoInfo);
      expect(url).toBe('https://codeload.github.com/user/repo/tar.gz/HEAD');
    });

    test('should build URL for specific branch', () => {
      const repoInfo = { owner: 'user', repo: 'repo', ref: 'develop' };
      const url = buildGitHubArchiveUrl(repoInfo);
      expect(url).toBe('https://codeload.github.com/user/repo/tar.gz/develop');
    });

    test('should build URL for commit SHA', () => {
      const repoInfo = { owner: 'user', repo: 'repo', ref: 'abc123def456' };
      const url = buildGitHubArchiveUrl(repoInfo);
      expect(url).toBe('https://codeload.github.com/user/repo/tar.gz/abc123def456');
    });

    test('should build URL for full commit SHA', () => {
      const repoInfo = { owner: 'user', repo: 'repo', ref: 'abc123def456789012345678901234567890abcd' };
      const url = buildGitHubArchiveUrl(repoInfo);
      expect(url).toBe('https://codeload.github.com/user/repo/tar.gz/abc123def456789012345678901234567890abcd');
    });
  });

  describe('buildGitHubMasterArchiveUrl', () => {
    test('should build URL for master branch fallback', () => {
      const repoInfo = { owner: 'user', repo: 'repo' };
      const url = buildGitHubMasterArchiveUrl(repoInfo);
      expect(url).toBe('https://codeload.github.com/user/repo/tar.gz/master');
    });

    test('should return null when ref is specified', () => {
      const repoInfo = { owner: 'user', repo: 'repo', ref: 'develop' };
      const url = buildGitHubMasterArchiveUrl(repoInfo);
      expect(url).toBeNull();
    });
  });

  describe('buildGitHubTagArchiveUrl', () => {
    test('should always return null since codeload.github.com resolves refs automatically', () => {
      expect(buildGitHubTagArchiveUrl({ owner: 'user', repo: 'repo', ref: 'v1.0.0' })).toBeNull();
      expect(buildGitHubTagArchiveUrl({ owner: 'user', repo: 'repo', ref: 'abc123def456' })).toBeNull();
      expect(buildGitHubTagArchiveUrl({ owner: 'user', repo: 'repo' })).toBeNull();
    });
  });

  describe('checkGitHubResponse', () => {
    test('should not throw for successful response', () => {
      const mockResponse = new Response('', { status: 200 });
      expect(() => checkGitHubResponse(mockResponse)).not.toThrow();
    });

    test('should throw RepomixError for 404', () => {
      const mockResponse = new Response('', { status: 404 });
      expect(() => checkGitHubResponse(mockResponse)).toThrow(RepomixError);
      expect(() => checkGitHubResponse(mockResponse)).toThrow('Repository not found or is private');
    });

    test('should throw RepomixError for 403 with rate limit', () => {
      const mockResponse = new Response('', {
        status: 403,
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1234567890' },
      });
      expect(() => checkGitHubResponse(mockResponse)).toThrow(RepomixError);
      expect(() => checkGitHubResponse(mockResponse)).toThrow('GitHub API rate limit exceeded');
    });

    test('should throw RepomixError for 403 without rate limit', () => {
      const mockResponse = new Response('', { status: 403 });
      expect(() => checkGitHubResponse(mockResponse)).toThrow(RepomixError);
      expect(() => checkGitHubResponse(mockResponse)).toThrow('Access denied');
    });

    test('should throw RepomixError for server errors', () => {
      const mockResponse = new Response('', { status: 500 });
      expect(() => checkGitHubResponse(mockResponse)).toThrow(RepomixError);
      expect(() => checkGitHubResponse(mockResponse)).toThrow('GitHub server error');
    });

    test('should throw RepomixError for other errors', () => {
      const mockResponse = new Response('', { status: 400 });
      expect(() => checkGitHubResponse(mockResponse)).toThrow(RepomixError);
      expect(() => checkGitHubResponse(mockResponse)).toThrow('GitHub API error');
    });
  });

  describe('parseGitHubRepoInfo integration', () => {
    test('should parse shorthand format', () => {
      const result = parseGitHubRepoInfo('yamadashy/repomix');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
      });
    });

    test('should parse HTTPS URL', () => {
      const result = parseGitHubRepoInfo('https://github.com/yamadashy/repomix.git');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
      });
    });

    test('should parse SSH URL', () => {
      const result = parseGitHubRepoInfo('git@github.com:yamadashy/repomix.git');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
      });
    });

    test('should parse URL with branch', () => {
      const result = parseGitHubRepoInfo('https://github.com/yamadashy/repomix/tree/develop');
      expect(result).toEqual({
        owner: 'yamadashy',
        repo: 'repomix',
        ref: 'develop',
      });
    });

    test('should return null for non-GitHub URLs', () => {
      const result = parseGitHubRepoInfo('https://gitlab.com/user/repo.git');
      expect(result).toBeNull();
    });

    test('should return null for invalid format', () => {
      const result = parseGitHubRepoInfo('invalid-format');
      expect(result).toBeNull();
    });
  });
});
