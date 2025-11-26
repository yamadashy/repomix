import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import type { PatchDetailLevel } from './gitHistory.js';

const execFileAsync = promisify(execFile);

export const execGitLogFilenames = async (
  directory: string,
  maxCommits = 100,
  deps = {
    execFileAsync,
  },
): Promise<string[]> => {
  try {
    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '--pretty=format:',
      '--name-only',
      '-n',
      maxCommits.toString(),
    ]);

    return result.stdout.split('\n').filter(Boolean);
  } catch (error) {
    logger.trace('Failed to get git log filenames:', (error as Error).message);
    return [];
  }
};

export const execGitDiff = async (
  directory: string,
  options: string[] = [],
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'diff',
      '--no-color', // Avoid ANSI color codes
      ...options,
    ]);

    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git diff:', (error as Error).message);
    throw error;
  }
};

export const execGitVersion = async (
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const result = await deps.execFileAsync('git', ['--version']);
    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git version:', (error as Error).message);
    throw error;
  }
};

export const execGitRevParse = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const result = await deps.execFileAsync('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git rev-parse:', (error as Error).message);
    throw error;
  }
};

export const execLsRemote = async (
  url: string,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  validateGitUrl(url);

  try {
    const result = await deps.execFileAsync('git', ['ls-remote', '--heads', '--tags', '--', url]);
    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git ls-remote:', (error as Error).message);
    throw error;
  }
};

export const execGitShallowClone = async (
  url: string,
  directory: string,
  remoteBranch?: string,
  deps = {
    execFileAsync,
  },
) => {
  validateGitUrl(url);

  if (remoteBranch) {
    await deps.execFileAsync('git', ['-C', directory, 'init']);
    await deps.execFileAsync('git', ['-C', directory, 'remote', 'add', '--', 'origin', url]);
    try {
      await deps.execFileAsync('git', ['-C', directory, 'fetch', '--depth', '1', 'origin', remoteBranch]);
      await deps.execFileAsync('git', ['-C', directory, 'checkout', 'FETCH_HEAD']);
    } catch (err: unknown) {
      // git fetch --depth 1 origin <short SHA> always throws "couldn't find remote ref" error
      const isRefNotfoundError =
        err instanceof Error && err.message.includes(`couldn't find remote ref ${remoteBranch}`);

      if (!isRefNotfoundError) {
        // Rethrow error as nothing else we can do
        throw err;
      }

      // Short SHA detection - matches a hexadecimal string of 4 to 39 characters
      // If the string matches this regex, it MIGHT be a short SHA
      // If the string doesn't match, it is DEFINITELY NOT a short SHA
      const isNotShortSHA = !remoteBranch.match(/^[0-9a-f]{4,39}$/i);

      if (isNotShortSHA) {
        // Rethrow error as nothing else we can do
        throw err;
      }

      // Maybe the error is due to a short SHA, let's try again
      // Can't use --depth 1 here as we need to fetch the specific commit
      await deps.execFileAsync('git', ['-C', directory, 'fetch', 'origin']);
      await deps.execFileAsync('git', ['-C', directory, 'checkout', remoteBranch]);
    }
  } else {
    await deps.execFileAsync('git', ['clone', '--depth', '1', '--', url, directory]);
  }

  // Clean up .git directory
  await fs.rm(path.join(directory, '.git'), { recursive: true, force: true });
};

export const execGitLog = async (
  directory: string,
  maxCommits: number,
  gitSeparator: string,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      `--pretty=format:${gitSeparator}%ad|%s`,
      '--date=iso',
      '--name-only',
      '-n',
      maxCommits.toString(),
    ]);

    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git log:', (error as Error).message);
    throw error;
  }
};

/**
 * Options for execGitLogComplete
 */
export interface GitLogCompleteOptions {
  directory: string;
  range?: string; // e.g., "HEAD~50..HEAD"
  maxCommits?: number; // e.g., 50 (used when no range)
  includeGraph?: boolean; // Adds --graph --all
  patchDetail?: PatchDetailLevel; // Adds --stat, --patch, etc.
}

/**
 * Execute git log with full metadata format in a single optimized call
 * Fetches all commit metadata, files, and optionally patches/graph in ONE git subprocess
 *
 * @param options - Configuration for what to include in output
 * @returns Raw git log output with record separators for parsing
 */
export const execGitLogComplete = async (
  options: GitLogCompleteOptions,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  // Full metadata format - all fields needed for complete commit information
  const RECORD_SEP = '%x1E'; // ASCII record separator between commits
  const FIELD_SEP = '%x1F'; // ASCII unit separator between fields
  const NULL_BYTE = '%x00'; // Separates metadata from files

  const metadataFormat = [
    '%H', // Full hash
    '%h', // Abbreviated hash
    '%P', // Parent hashes (space-separated)
    '%an', // Author name
    '%ae', // Author email
    '%aI', // Author date (ISO 8601)
    '%cn', // Committer name
    '%ce', // Committer email
    '%cI', // Committer date (ISO 8601)
    '%s', // Subject (first line of message)
    '%b', // Body (rest of message)
  ].join(`%n${FIELD_SEP}`); // Use field separator for reliable parsing

  const args = [
    '-C',
    options.directory,
    'log',
    `--pretty=format:${RECORD_SEP}${metadataFormat}${NULL_BYTE}`,
    '--name-only',
  ];

  // Add patch format conditionally (git supports combining with --pretty)
  if (options.patchDetail) {
    switch (options.patchDetail) {
      case 'patch':
        args.push('--patch');
        break;
      case 'stat':
        args.push('--stat');
        break;
      case 'numstat':
        args.push('--numstat');
        break;
      case 'shortstat':
        args.push('--shortstat');
        break;
      case 'dirstat':
        args.push('--dirstat');
        break;
      case 'name-status':
        args.push('--name-status');
        break;
      case 'raw':
        args.push('--raw');
        break;
      case 'name-only':
        // Already added via --name-only above
        break;
    }
  }

  // Add graph visualization conditionally
  if (options.includeGraph) {
    args.push('--graph', '--all');
  }

  // Add range or commit count
  if (options.range) {
    args.push(options.range);
  } else if (options.maxCommits) {
    args.push('-n', options.maxCommits.toString());
  }

  try {
    const result = await deps.execFileAsync('git', args);
    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git log with complete metadata:', (error as Error).message);
    throw error;
  }
};

/**
 * Validates a Git URL for security and format
 * @throws {RepomixError} If the URL is invalid or contains potentially dangerous parameters
 */
export const validateGitUrl = (url: string): void => {
  if (url.includes('--upload-pack') || url.includes('--config') || url.includes('--exec')) {
    throw new RepomixError(`Invalid repository URL. URL contains potentially dangerous parameters: ${url}`);
  }

  // Check if the URL starts with git@ or https://
  if (!(url.startsWith('git@') || url.startsWith('https://'))) {
    throw new RepomixError(`Invalid URL protocol for '${url}'. URL must start with 'git@' or 'https://'`);
  }

  try {
    if (url.startsWith('https://')) {
      new URL(url);
    }
  } catch (error: unknown) {
    // Redact embedded credentials in https URLs to avoid PII leakage
    const redactedUrl = url.startsWith('https://') ? url.replace(/^(https?:\/\/)([^@/]+)@/i, '$1***@') : url;
    logger.trace('Invalid repository URL:', (error as Error).message);
    throw new RepomixError(`Invalid repository URL. Please provide a valid URL: ${redactedUrl}`);
  }
};
