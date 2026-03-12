import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as zlib from 'node:zlib';
import { extract as tarExtract } from 'tar';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import {
  buildGitHubArchiveUrl,
  buildGitHubMasterArchiveUrl,
  buildGitHubTagArchiveUrl,
  checkGitHubResponse,
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

export interface ArchiveDownloadDeps {
  fetch: typeof globalThis.fetch;
  pipeline: typeof pipeline;
  Transform: typeof Transform;
  tarExtract: typeof tarExtract;
  createGunzip: typeof zlib.createGunzip;
}

const defaultDeps: ArchiveDownloadDeps = {
  fetch: globalThis.fetch,
  pipeline,
  Transform,
  tarExtract,
  createGunzip: zlib.createGunzip,
};

/**
 * Downloads and extracts a GitHub repository archive using streaming tar.gz extraction
 */
export const downloadGitHubArchive = async (
  repoInfo: GitHubRepoInfo,
  targetDirectory: string,
  options: ArchiveDownloadOptions = {},
  onProgress?: ProgressCallback,
  deps: ArchiveDownloadDeps = defaultDeps,
): Promise<void> => {
  const { timeout = 30000, retries = 3 } = options;

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

        await downloadAndExtractArchive(archiveUrl, targetDirectory, timeout, onProgress, deps);

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
 * Downloads and extracts a tar.gz archive from a single URL using streaming pipeline.
 * The HTTP response is streamed through gunzip and tar extract directly to disk,
 * without writing a temporary archive file.
 */
const downloadAndExtractArchive = async (
  archiveUrl: string,
  targetDirectory: string,
  timeout: number,
  onProgress?: ProgressCallback,
  deps: ArchiveDownloadDeps = defaultDeps,
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await deps.fetch(archiveUrl, {
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

    // Stream: HTTP response -> progress tracking -> gunzip -> tar extract to disk
    // strip: 1 removes the top-level "repo-branch/" directory from archive paths
    const extractStream = deps.tarExtract({
      cwd: targetDirectory,
      strip: 1,
    });
    const gunzipStream = deps.createGunzip();

    try {
      await deps.pipeline(nodeStream, progressStream, gunzipStream, extractStream);
    } finally {
      // Explicitly destroy streams to release handles.
      // Bun's pipeline() may not fully clean up, causing subsequent worker_threads to hang.
      nodeStream.destroy();
      progressStream.destroy();
      gunzipStream.destroy();
    }
  } finally {
    clearTimeout(timeoutId);
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
