import { type GitHubRepoInfo, parseGitHubRepoInfo } from 'repomix';
import { AppError } from '../../../utils/errorHandler.js';

// Maximum repository size allowed for processing (in KB, as returned by GitHub API)
const MAX_REPO_SIZE_KB = 500 * 1024; // 500MB

// Timeout for GitHub API requests (in milliseconds)
const GITHUB_API_TIMEOUT_MS = 10_000;

interface GitHubRepoResponse {
  size: number; // Repository size in KB
}

/**
 * Fetches repository size from GitHub API.
 * Returns the size in KB, or null if the request fails.
 */
const fetchGitHubRepoSize = async (repoInfo: GitHubRepoInfo): Promise<number | null> => {
  const url = `https://api.github.com/repos/${encodeURIComponent(repoInfo.owner)}/${encodeURIComponent(repoInfo.repo)}`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Repomix',
    };

    const token = process.env.GITHUB_TOKEN_REPO_SIZE_CHECK;
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GitHubRepoResponse;
    return data.size;
  } catch {
    // If the API request fails, allow processing to continue
    return null;
  }
};

const formatSizeMB = (sizeKB: number): string => {
  return `${(sizeKB / 1024).toFixed(1)}MB`;
};

/**
 * Checks if a GitHub repository exceeds the maximum allowed size.
 * Throws an AppError if the repository is too large.
 * Silently allows processing if the size cannot be determined (non-GitHub repos, API errors).
 */
export const checkGitHubRepoSize = async (repoUrl: string): Promise<void> => {
  const repoInfo = parseGitHubRepoInfo(repoUrl);
  if (!repoInfo) {
    // Not a GitHub repository, skip size check
    return;
  }

  const sizeKB = await fetchGitHubRepoSize(repoInfo);
  if (sizeKB == null) {
    // Could not determine size, allow processing to continue
    return;
  }

  if (sizeKB > MAX_REPO_SIZE_KB) {
    throw new AppError(
      `Repository is too large to process. The repository size is ${formatSizeMB(sizeKB)}, but the maximum allowed size is ${formatSizeMB(MAX_REPO_SIZE_KB)}.`,
      422,
    );
  }
};
