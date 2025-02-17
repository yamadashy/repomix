import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import JSZip from 'jszip';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

export interface GitHubUrlInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export const VALID_NAME_PATTERN = '[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?';
export const validShorthandRegex = new RegExp(`^${VALID_NAME_PATTERN}/${VALID_NAME_PATTERN}$`);

/**
 * Check if value is GitHub shorthand format (e.g. owner/repo)
 */
export const isGitHubShorthand = (value: string): boolean => {
  return validShorthandRegex.test(value);
};

/**
 * Check if URL is a GitHub repository URL or shorthand
 */
export const isGitHubUrlOrShorthand = (value: string): boolean => {
  return value.includes('github.com') || isGitHubShorthand(value);
};

/**
 * Parse GitHub URL or shorthand to extract owner, repo and branch information
 */
export const parseGitHubUrl = (url: string): GitHubUrlInfo => {
  // Handle shorthand format first
  if (isGitHubShorthand(url)) {
    const [owner, repo] = url.split('/');
    return { owner, repo };
  }

  // Extract owner and repo from full URL
  const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!repoMatch) {
    throw new RepomixError('Invalid GitHub repository URL');
  }
  const [, owner, repo] = repoMatch;

  // Extract branch from URL if present
  // First find the position of /tree/
  const treeIndex = url.indexOf('/tree/');
  if (treeIndex !== -1) {
    // Extract everything after /tree/
    const branch = url.slice(treeIndex + 6); // 6 is length of '/tree/'
    return { owner, repo, branch };
  }

  return { owner, repo };
};
/**
 * Build GitHub zip download URL
 */
export const buildZipUrl = (owner: string, repo: string, branch?: string): string => {
  let zipUrl = `https://github.com/${owner}/${repo}/archive/`;
  if (branch) {
    zipUrl += `refs/heads/${branch}.zip`;
  } else {
    zipUrl += 'HEAD.zip';
  }
  return zipUrl;
};

/**
 * Download and extract GitHub repository zip
 */
export const downloadGitHubZip = async (
  url: string,
  directory: string,
  remoteBranch?: string,
  deps = {
    fetch: globalThis.fetch,
    JSZip,
  },
): Promise<void> => {
  const { owner, repo, branch } = parseGitHubUrl(url);
  const effectiveBranch = remoteBranch || branch;
  const zipUrl = buildZipUrl(owner, repo, effectiveBranch);

  logger.trace(`Downloading zip from: ${zipUrl}`);

  try {
    // Download zip
    const response = await deps.fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract zip
    const zip = await deps.JSZip.loadAsync(buffer);
    const rootDirName = Object.keys(zip.files)[0]; // First entry is root directory

    // Extract files
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      // Remove root directory from path
      const relativePath = filename.replace(rootDirName, '');
      const targetPath = path.join(directory, relativePath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Extract file
      const content = await file.async('nodebuffer');
      await fs.writeFile(targetPath, content);
    }

    logger.trace('Zip extraction completed');
  } catch (error) {
    throw new RepomixError(`Failed to download or extract repository: ${(error as Error).message}`);
  }
};
