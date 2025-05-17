import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import url from 'node:url';
import AdmZip from 'adm-zip';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

/**
 * Download a GitHub repository as a zip file and extract it to the specified directory
 */
export const downloadGithubRepoAsZip = async (
  owner: string,
  repo: string,
  destPath: string,
  branch = 'main',
): Promise<void> => {
  const zipUrl = `https://github.com/${owner}/${repo}/archive/${branch}.zip`;
  const zipFilePath = path.join(destPath, 'repo.zip');

  try {
    await downloadFile(zipUrl, zipFilePath);

    await extractZip(zipFilePath, destPath);

    await fs.unlink(zipFilePath);

    const extractedDirName = `${repo}-${branch}`;
    const extractedDirPath = path.join(destPath, extractedDirName);

    try {
      await fs.access(extractedDirPath);
    } catch (error) {
      const mainBranchDirName = `${repo}-main`;
      const mainBranchDirPath = path.join(destPath, mainBranchDirName);

      try {
        await fs.access(mainBranchDirPath);
        await moveDirectoryContents(mainBranchDirPath, destPath);
        await fs.rm(mainBranchDirPath, { recursive: true });
        return;
      } catch (innerError) {
        const files = await fs.readdir(destPath);

        const repoDirPattern = new RegExp(`^${repo}-`);
        const repoDir = files.find((file) => repoDirPattern.test(file) && file !== 'repo.zip');

        if (repoDir) {
          const repoDirPath = path.join(destPath, repoDir);
          await moveDirectoryContents(repoDirPath, destPath);
          await fs.rm(repoDirPath, { recursive: true });
          return;
        }

        throw new RepomixError(`Failed to find extracted repository directory in ${destPath}`);
      }
    }

    await moveDirectoryContents(extractedDirPath, destPath);

    await fs.rm(extractedDirPath, { recursive: true });
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }

    if (error instanceof Error && error.message.includes('401')) {
      throw new RepomixError('Authentication failed. The repository might be private. Falling back to git clone.');
    }

    if (error instanceof Error && error.message.includes('404')) {
      throw new RepomixError('Repository not found. Please check the repository URL.');
    }

    throw new RepomixError(`Failed to download GitHub repository: ${(error as Error).message}`);
  }
};

/**
 * Download a file from a URL to a local path, following redirects
 */
const downloadFile = (url: string, destPath: string, redirectCount = 0): Promise<void> => {
  return new Promise((resolve, reject) => {
    const MAX_REDIRECTS = 5;

    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error('Too many redirects'));
      return;
    }

    logger.trace(`Downloading file from ${url} to ${destPath}`);

    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;

          if (!location) {
            reject(new Error(`Redirect (${response.statusCode}) without Location header`));
            return;
          }

          logger.trace(`Following redirect (${response.statusCode}) to: ${location}`);

          const redirectUrl = new URL(location, url).toString();

          downloadFile(redirectUrl, destPath, redirectCount + 1)
            .then(resolve)
            .catch(reject);

          return;
        }

        if (response.statusCode === 401) {
          reject(new Error('401 Unauthorized: Authentication required'));
          return;
        }

        if (response.statusCode === 404) {
          reject(new Error('404 Not Found: Repository or branch not found'));
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: HTTP status code ${response.statusCode}`));
          return;
        }

        fs.open(destPath, 'w')
          .then((fileHandle) => fileHandle.createWriteStream())
          .then((stream) => {
            response.pipe(stream);

            stream.on('finish', () => {
              stream.end();
              resolve();
            });

            stream.on('error', (err) => {
              reject(err);
            });
          })
          .catch((err) => {
            reject(err);
          });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

/**
 * Extract a zip file to a directory with path validation to prevent zip-slip attacks
 */
const extractZip = async (zipFilePath: string, destPath: string): Promise<void> => {
  try {
    logger.trace(`Extracting zip file ${zipFilePath} to ${destPath}`);

    const zipBuffer = await fs.readFile(zipFilePath);
    const zip = new AdmZip(zipBuffer);

    // First validate all paths to prevent zip-slip attacks
    for (const entry of zip.getEntries()) {
      const entryPath = path.resolve(destPath, entry.entryName);
      if (!entryPath.startsWith(path.resolve(destPath))) {
        throw new RepomixError(`Zip entry path traversal detected: ${entry.entryName}`);
      }
    }

    zip.extractAllTo(destPath, true);
  } catch (error) {
    throw new RepomixError(`Failed to extract zip file: ${(error as Error).message}`);
  }
};

/**
 * Move all contents from one directory to another
 */
const moveDirectoryContents = async (sourcePath: string, destPath: string): Promise<void> => {
  try {
    logger.trace(`Moving contents from ${sourcePath} to ${destPath}`);

    const files = await fs.readdir(sourcePath);

    for (const file of files) {
      const sourceFilePath = path.join(sourcePath, file);
      const destFilePath = path.join(destPath, file);

      await fs.rename(sourceFilePath, destFilePath);
    }
  } catch (error) {
    throw new RepomixError(`Failed to move directory contents: ${(error as Error).message}`);
  }
};

/**
 * Check if a URL is a GitHub repository URL
 */
export const isGithubRepoUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'github.com';
  } catch (error) {
    return false;
  }
};

/**
 * Parse a GitHub repository URL to extract owner, repo, and branch
 */
export const parseGithubRepoUrl = (url: string): { owner: string; repo: string; branch?: string } => {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname !== 'github.com') {
      throw new RepomixError('Not a GitHub repository URL');
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      throw new RepomixError('Invalid GitHub repository URL');
    }

    const owner = pathParts[0];
    let repo = pathParts[1];

    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }

    let branch: string | undefined;

    if (pathParts.length > 3 && pathParts[2] === 'tree') {
      branch = pathParts[3];
    }

    return { owner, repo, branch };
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }

    throw new RepomixError(`Failed to parse GitHub repository URL: ${(error as Error).message}`);
  }
};
