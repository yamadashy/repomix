import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

const GIT_REMOTE_TIMEOUT = 30000;
const gitRemoteEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
const gitRemoteOpts = { timeout: GIT_REMOTE_TIMEOUT, env: gitRemoteEnv };

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
    const result = await deps.execFileAsync('git', ['ls-remote', '--heads', '--tags', '--', url], gitRemoteOpts);
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
      await deps.execFileAsync(
        'git',
        ['-C', directory, 'fetch', '--depth', '1', 'origin', remoteBranch],
        gitRemoteOpts,
      );
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
      await deps.execFileAsync('git', ['-C', directory, 'fetch', 'origin'], gitRemoteOpts);
      await deps.execFileAsync('git', ['-C', directory, 'checkout', remoteBranch]);
    }
  } else {
    await deps.execFileAsync('git', ['clone', '--depth', '1', '--', url, directory], gitRemoteOpts);
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
 * Validates a Git URL for security and format
 * @throws {RepomixError} If the URL is invalid or contains potentially dangerous parameters
 */
export const validateGitUrl = (url: string): void => {
  // Block dangerous git parameters that could be used for command injection
  const dangerousParams = ['--upload-pack', '--receive-pack', '--config', '--exec'];
  if (dangerousParams.some((param) => url.includes(param))) {
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
