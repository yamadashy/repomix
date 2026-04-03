import { RepomixError } from '../../shared/errorHandle.js';
import type { GitHubRepoInfo } from './gitRemoteParse.js';

/**
 * Constructs GitHub archive download URL using codeload.github.com directly.
 * This skips the 302 redirect from github.com/archive, saving ~100-300ms per request.
 * codeload.github.com resolves branches, tags, and commit SHAs automatically,
 * so no refs/heads/ or refs/tags/ prefix is needed.
 * Format: https://codeload.github.com/owner/repo/tar.gz/{ref}
 */
export const buildGitHubArchiveUrl = (repoInfo: GitHubRepoInfo): string => {
  const { owner, repo, ref } = repoInfo;
  const baseUrl = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tar.gz`;
  return `${baseUrl}/${ref ? encodeURIComponent(ref) : 'HEAD'}`;
};

/**
 * Builds alternative archive URL for master branch as fallback
 */
export const buildGitHubMasterArchiveUrl = (repoInfo: GitHubRepoInfo): string | null => {
  const { owner, repo, ref } = repoInfo;
  if (ref) {
    return null; // Only applicable when no ref is specified
  }

  return `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tar.gz/master`;
};

/**
 * Builds alternative archive URL for tags
 * With codeload.github.com, refs are resolved automatically so tag fallback is no longer needed.
 */
export const buildGitHubTagArchiveUrl = (_repoInfo: GitHubRepoInfo): string | null => {
  return null;
};

/**
 * Checks if a response indicates a GitHub API rate limit or error
 */
export const checkGitHubResponse = (response: Response): void => {
  if (response.status === 404) {
    throw new RepomixError(
      'Repository not found or is private. Please check the repository URL and your access permissions.',
    );
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    if (rateLimitRemaining === '0') {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetDate = resetTime ? new Date(Number.parseInt(resetTime, 10) * 1000) : null;
      throw new RepomixError(
        `GitHub API rate limit exceeded. ${resetDate ? `Rate limit resets at ${resetDate.toISOString()}` : 'Please try again later.'}`,
      );
    }
    throw new RepomixError(
      'Access denied. The repository might be private or you might not have permission to access it.',
    );
  }

  if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
    throw new RepomixError('GitHub server error. Please try again later.');
  }

  if (!response.ok) {
    throw new RepomixError(`GitHub API error: ${response.status} ${response.statusText}`);
  }
};
