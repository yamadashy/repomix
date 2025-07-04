import { createWriteStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { unzip } from 'fflate';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import {
  buildGitHubArchiveUrl,
  buildGitHubMasterArchiveUrl,
  buildGitHubTagArchiveUrl,
  checkGitHubResponse,
  getArchiveFilename,
} from './gitHubArchiveApi.js';
import type { GitHubRepoInfo } from './gitRemoteParse.js';

export interface ArchiveDownloadOptions {
  timeout?: number; // Download timeout in milliseconds (default: 30000)
  retries?: number; // Number of retry attempts (default: 3)
}

export interface ArchiveDownloadProgress {
  downloaded: number;
  total: number | null;
  percentage: number | null;
}

export type ProgressCallback = (progress: ArchiveDownloadProgress) => void;

/**
 * Downloads and extracts a GitHub repository archive
 */
export const downloadGitHubArchive = async (
  repoInfo: GitHubRepoInfo,
  targetDirectory: string,
  options: ArchiveDownloadOptions = {},
  onProgress?: ProgressCallback,
  deps = {
    fetch: globalThis.fetch,
    fs,
    pipeline,
    Transform,
    createWriteStream,
  },
): Promise<void> => {
  const { timeout = 30000, retries = 3 } = options;

  // Ensure target directory exists
  await deps.fs.mkdir(targetDirectory, { recursive: true });

  let lastError: Error | null = null;

  // Try downloading with multiple URL formats: main branch, master branch (fallback), then tag format
  const archiveUrls = [
    buildGitHubArchiveUrl(repoInfo),
    buildGitHubMasterArchiveUrl(repoInfo),
    buildGitHubTagArchiveUrl(repoInfo),
  ].filter(Boolean) as string[];

  for (const archiveUrl of archiveUrls) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.trace(`Downloading GitHub archive from: ${archiveUrl} (attempt ${attempt}/${retries})`);

        await downloadAndExtractArchive(archiveUrl, targetDirectory, repoInfo, timeout, onProgress, deps);

        logger.trace('Successfully downloaded and extracted GitHub archive');
        return; // Success - exit early
      } catch (error) {
        lastError = error as Error;
        logger.trace(`Archive download attempt ${attempt} failed:`, lastError.message);

        // If it's a 404-like error and we have more URLs to try, don't retry this URL
        const isNotFoundError =
          lastError instanceof RepomixError &&
          (lastError.message.includes('not found') || lastError.message.includes('404'));
        if (isNotFoundError && archiveUrls.length > 1) {
          break;
        }

        // If it's the last attempt, don't wait
        if (attempt < retries) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 5000); // Exponential backoff, max 5s
          logger.trace(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  // If we get here, all attempts failed
  throw new RepomixError(
    `Failed to download GitHub archive after ${retries} attempts. ${lastError?.message || 'Unknown error'}`,
  );
};

/**
 * Downloads and extracts archive from a single URL
 */
const downloadAndExtractArchive = async (
  archiveUrl: string,
  targetDirectory: string,
  repoInfo: GitHubRepoInfo,
  timeout: number,
  onProgress?: ProgressCallback,
  deps = {
    fetch: globalThis.fetch,
    fs,
    pipeline,
    Transform,
    createWriteStream,
  },
): Promise<void> => {
  // Download the archive
  const tempArchivePath = path.join(targetDirectory, getArchiveFilename(repoInfo));

  await downloadFile(archiveUrl, tempArchivePath, timeout, onProgress, deps);

  try {
    // Extract the archive
    await extractZipArchive(tempArchivePath, targetDirectory, repoInfo, { fs: deps.fs });
  } finally {
    // Clean up the downloaded archive file
    try {
      await deps.fs.unlink(tempArchivePath);
    } catch (error) {
      logger.trace('Failed to cleanup archive file:', (error as Error).message);
    }
  }
};

/**
 * Downloads a file from URL with progress tracking
 */
const downloadFile = async (
  url: string,
  filePath: string,
  timeout: number,
  onProgress?: ProgressCallback,
  deps = {
    fetch: globalThis.fetch,
    fs,
    pipeline,
    Transform,
    createWriteStream,
  },
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await deps.fetch(url, {
      signal: controller.signal,
    });

    checkGitHubResponse(response);

    if (!response.body) {
      throw new RepomixError('No response body received');
    }

    const totalSize = response.headers.get('content-length');
    const total = totalSize ? Number.parseInt(totalSize, 10) : null;
    let downloaded = 0;
    let lastProgressUpdate = 0;

    // Use Readable.fromWeb for better stream handling
    const nodeStream = Readable.fromWeb(response.body);

    // Transform stream for progress tracking
    const progressStream = new deps.Transform({
      transform(chunk, _encoding, callback) {
        downloaded += chunk.length;

        // Update progress at most every 100ms to avoid too frequent updates
        const now = Date.now();
        if (onProgress && now - lastProgressUpdate > 100) {
          lastProgressUpdate = now;
          onProgress({
            downloaded,
            total,
            percentage: total ? Math.round((downloaded / total) * 100) : null,
          });
        }

        callback(null, chunk);
      },
      flush(callback) {
        // Send final progress update
        if (onProgress) {
          onProgress({
            downloaded,
            total,
            percentage: total ? 100 : null,
          });
        }
        callback();
      },
    });

    // Write to file
    const writeStream = deps.createWriteStream(filePath);
    await deps.pipeline(nodeStream, progressStream, writeStream);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Extracts a ZIP archive using fflate library
 */
const extractZipArchive = async (
  archivePath: string,
  targetDirectory: string,
  repoInfo: GitHubRepoInfo,
  deps = {
    fs,
  },
): Promise<void> => {
  try {
    // Always use in-memory extraction for simplicity and reliability
    await extractZipArchiveInMemory(archivePath, targetDirectory, repoInfo, deps);
  } catch (error) {
    throw new RepomixError(`Failed to extract archive: ${(error as Error).message}`);
  }
};

/**
 * Extracts ZIP archive by loading it entirely into memory (faster for small files)
 */
const extractZipArchiveInMemory = async (
  archivePath: string,
  targetDirectory: string,
  repoInfo: GitHubRepoInfo,
  deps = {
    fs,
  },
): Promise<void> => {
  // Read the ZIP file as a buffer
  const zipBuffer = await deps.fs.readFile(archivePath);
  const zipUint8Array = new Uint8Array(zipBuffer);

  // Extract ZIP using fflate
  await new Promise<void>((resolve, reject) => {
    unzip(zipUint8Array, (err, extracted) => {
      if (err) {
        reject(new RepomixError(`Failed to extract ZIP archive: ${err.message}`));
        return;
      }

      // Process extracted files concurrently in the callback
      processExtractedFiles(extracted, targetDirectory, repoInfo, deps).then(resolve).catch(reject);
    });
  });
};

/**
 * Process extracted files sequentially to avoid EMFILE errors
 */
const processExtractedFiles = async (
  extracted: Record<string, Uint8Array>,
  targetDirectory: string,
  repoInfo: GitHubRepoInfo,
  deps = {
    fs,
  },
): Promise<void> => {
  const repoPrefix = `${repoInfo.repo}-`;
  const createdDirs = new Set<string>();

  // Process files sequentially to avoid EMFILE errors completely
  for (const [filePath, fileData] of Object.entries(extracted)) {
    // GitHub archives have a top-level directory like "repo-branch/"
    // We need to remove this prefix from the file paths
    let relativePath = filePath;

    // Find and remove the repo prefix
    const pathParts = filePath.split('/');
    if (pathParts.length > 0 && pathParts[0].startsWith(repoPrefix)) {
      // Remove the first directory (repo-branch/)
      relativePath = pathParts.slice(1).join('/');
    }

    // Skip empty paths (root directory)
    if (!relativePath) {
      continue;
    }

    // Sanitize relativePath to prevent path traversal attacks
    const sanitized = path.normalize(relativePath).replace(/^(\.\.([/\\]|$))+/, '');

    // Reject absolute paths outright
    if (path.isAbsolute(sanitized)) {
      logger.trace(`Absolute path detected in archive, skipping: ${relativePath}`);
      continue;
    }

    const targetPath = path.resolve(targetDirectory, sanitized);
    if (!targetPath.startsWith(path.resolve(targetDirectory))) {
      logger.trace(`Unsafe path detected in archive, skipping: ${relativePath}`);
      continue;
    }

    // Check if this entry is a directory (ends with /) or empty file data indicates directory
    const isDirectory = filePath.endsWith('/') || (fileData.length === 0 && relativePath.endsWith('/'));

    if (isDirectory) {
      // Create directory immediately
      if (!createdDirs.has(targetPath)) {
        logger.trace(`Creating directory: ${targetPath}`);
        await deps.fs.mkdir(targetPath, { recursive: true });
        createdDirs.add(targetPath);
      }
    } else {
      // Create parent directory if needed and write file
      const parentDir = path.dirname(targetPath);
      if (!createdDirs.has(parentDir)) {
        logger.trace(`Creating parent directory for file: ${parentDir}`);
        await deps.fs.mkdir(parentDir, { recursive: true });
        createdDirs.add(parentDir);
      }

      // Write file sequentially
      logger.trace(`Writing file: ${targetPath}`);
      try {
        await deps.fs.writeFile(targetPath, fileData);
      } catch (fileError) {
        logger.trace(`Failed to write file ${targetPath}: ${(fileError as Error).message}`);
        throw fileError;
      }
    }
  }
};

/**
 * Checks if archive download is supported for the given repository info
 */
export const isArchiveDownloadSupported = (_repoInfo: GitHubRepoInfo): boolean => {
  // Archive download is supported for all GitHub repositories
  // In the future, we might add conditions here (e.g., size limits, private repos)
  return true;
};
