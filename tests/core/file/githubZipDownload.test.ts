import { describe, expect, it, vi } from 'vitest';
import { isGithubRepoUrl, parseGithubRepoUrl } from '../../../src/core/file/githubZipDownload.js';

describe('isGithubRepoUrl', () => {
  it('should return true for GitHub URLs', () => {
    expect(isGithubRepoUrl('https://github.com/user/repo')).toBe(true);
    expect(isGithubRepoUrl('https://github.com/user/repo.git')).toBe(true);
    expect(isGithubRepoUrl('https://github.com/user/repo/tree/main')).toBe(true);
  });

  it('should return false for non-GitHub URLs', () => {
    expect(isGithubRepoUrl('https://gitlab.com/user/repo')).toBe(false);
    expect(isGithubRepoUrl('https://bitbucket.org/user/repo')).toBe(false);
    expect(isGithubRepoUrl('not-a-url')).toBe(false);
  });
});

describe('parseGithubRepoUrl', () => {
  it('should parse GitHub repository URLs correctly', () => {
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

  it('should throw an error for non-GitHub URLs', () => {
    expect(() => parseGithubRepoUrl('https://gitlab.com/user/repo')).toThrow('Not a GitHub repository URL');
  });

  it('should throw an error for invalid GitHub URLs', () => {
    expect(() => parseGithubRepoUrl('https://github.com/')).toThrow('Invalid GitHub repository URL');
    expect(() => parseGithubRepoUrl('https://github.com/user')).toThrow('Invalid GitHub repository URL');
  });
});
