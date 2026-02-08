import gitUrlParse, { type GitUrl } from 'git-url-parse';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

interface IGitUrl extends GitUrl {
  commit: string | undefined;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  ref?: string; // branch, tag, or commit SHA
}

// Check the short form of the GitHub URL. e.g. yamadashy/repomix
const VALID_NAME_PATTERN = '[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?';
const validShorthandRegex = new RegExp(`^${VALID_NAME_PATTERN}/${VALID_NAME_PATTERN}$`);
export const isValidShorthand = (remoteValue: string): boolean => {
  return validShorthandRegex.test(remoteValue);
};

/**
 * Check if a URL is an Azure DevOps repository URL by validating the hostname.
 * This uses proper URL parsing to avoid security issues with substring matching.
 */
const isAzureDevOpsUrl = (remoteValue: string): boolean => {
  // Handle SSH URLs (e.g., git@ssh.dev.azure.com:v3/org/project/repo)
  if (remoteValue.startsWith('git@ssh.dev.azure.com:')) {
    return true;
  }

  // Handle HTTP(S) URLs
  try {
    const url = new URL(remoteValue);
    const hostname = url.hostname.toLowerCase();

    // Check for exact Azure DevOps hostnames
    if (hostname === 'dev.azure.com' || hostname === 'ssh.dev.azure.com') {
      return true;
    }

    // Check for legacy Visual Studio Team Services (*.visualstudio.com)
    if (hostname.endsWith('.visualstudio.com')) {
      return true;
    }

    return false;
  } catch {
    // Not a valid URL, let git-url-parse handle it
    return false;
  }
};

export const parseRemoteValue = (
  remoteValue: string,
  refs: string[] = [],
): { repoUrl: string; remoteBranch: string | undefined } => {
  if (isValidShorthand(remoteValue)) {
    logger.trace(`Formatting GitHub shorthand: ${remoteValue}`);
    return {
      repoUrl: `https://github.com/${remoteValue}.git`,
      remoteBranch: undefined,
    };
  }

  // Check for Azure DevOps URLs before parsing, as git-url-parse may not handle them correctly
  // - SSH: git@ssh.dev.azure.com:v3/org/project/repo
  // - HTTPS: https://dev.azure.com/organization/project/_git/repo
  // - Legacy: https://org.visualstudio.com/project/_git/repo
  if (isAzureDevOpsUrl(remoteValue)) {
    return {
      repoUrl: remoteValue,
      remoteBranch: undefined,
    };
  }

  try {
    const parsedFields = gitUrlParse(remoteValue, refs) as IGitUrl;

    // This will make parsedFields.toString() automatically append '.git' to the returned url
    parsedFields.git_suffix = true;

    const ownerSlashRepo =
      parsedFields.full_name.split('/').length > 1 ? parsedFields.full_name.split('/').slice(-2).join('/') : '';

    if (ownerSlashRepo !== '' && !isValidShorthand(ownerSlashRepo)) {
      throw new RepomixError('Invalid owner/repo in repo URL');
    }

    const repoUrl = parsedFields.toString(parsedFields.protocol);

    if (parsedFields.ref) {
      return {
        repoUrl: repoUrl,
        remoteBranch: parsedFields.ref,
      };
    }

    if (parsedFields.commit) {
      return {
        repoUrl: repoUrl,
        remoteBranch: parsedFields.commit,
      };
    }

    return {
      repoUrl: repoUrl,
      remoteBranch: undefined,
    };
  } catch {
    throw new RepomixError('Invalid remote repository URL or repository shorthand (owner/repo)');
  }
};

/**
 * Checks if a string is an explicit remote URL (https:// or git@).
 * This intentionally does NOT match shorthand (owner/repo) to avoid ambiguity with local directory paths.
 */
export const isExplicitRemoteUrl = (value: string): boolean => {
  return value.startsWith('https://') || value.startsWith('git@');
};

export const isValidRemoteValue = (remoteValue: string, refs: string[] = []): boolean => {
  try {
    parseRemoteValue(remoteValue, refs);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parses remote value and extracts GitHub repository information if it's a GitHub repo
 * Returns null if the remote value is not a GitHub repository
 */
export const parseGitHubRepoInfo = (remoteValue: string): GitHubRepoInfo | null => {
  try {
    // Handle shorthand format: owner/repo
    if (isValidShorthand(remoteValue)) {
      const [owner, repo] = remoteValue.split('/');
      return { owner, repo };
    }

    // For GitHub URLs with branch/tag/commit info, extract directly from URL
    try {
      const url = new URL(remoteValue);
      const allowedHosts = ['github.com', 'www.github.com'];

      if (allowedHosts.includes(url.hostname)) {
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          const repo = pathParts[1].replace(/\.git$/, '');

          const result: GitHubRepoInfo = { owner, repo };

          // Extract ref from URL patterns like /tree/branch or /commit/sha
          if (pathParts.length >= 4 && (pathParts[2] === 'tree' || pathParts[2] === 'commit')) {
            result.ref = pathParts.slice(3).join('/');
          }

          return result;
        }
      }
    } catch (urlError) {
      // Fall back to git-url-parse if URL parsing fails
      logger.trace('URL parsing failed, falling back to git-url-parse:', (urlError as Error).message);
    }

    // Parse using git-url-parse for other cases
    const parsed = gitUrlParse(remoteValue) as IGitUrl;

    // Only proceed if it's a GitHub repository
    if (parsed.source !== 'github.com') {
      return null;
    }

    // Extract owner and repo from full_name (e.g., "owner/repo")
    const [owner, repo] = parsed.full_name.split('/');
    if (!owner || !repo) {
      return null;
    }

    const result: GitHubRepoInfo = {
      owner,
      repo: repo.replace(/\.git$/, ''), // Remove .git suffix
    };

    // Add ref if available
    if (parsed.ref) {
      result.ref = parsed.ref;
    } else if (parsed.commit) {
      result.ref = parsed.commit;
    }

    return result;
  } catch (error) {
    logger.trace('Failed to parse GitHub repo info:', (error as Error).message);
    return null;
  }
};

/**
 * Checks if a remote value represents a GitHub repository
 */
export const isGitHubRepository = (remoteValue: string): boolean => {
  return parseGitHubRepoInfo(remoteValue) !== null;
};
