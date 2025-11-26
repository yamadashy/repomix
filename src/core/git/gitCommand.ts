import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

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

// ===== Two-Pass Git Log =====
//
// Two-pass architecture for robust git log parsing:
// - Pass 1 (execGitLogStructured): Metadata + NUL-terminated file entries via -z --raw
// - Pass 2 (execGitLogTextBlob): Patch/stat text content, only when requested
// - Pass 3 (execGitGraph): Separate graph call avoids prefix interleaving complexity
//
// Format separators - NUL (\x00) is used for ALL delimiters because:
// - Git REJECTS commits containing NUL bytes ("a NUL byte in commit log message not allowed")
// - This makes NUL 100% safe as a delimiter - it cannot appear in messages, names, or emails
// - ASCII control characters like \x1E and \x1F CAN appear in commit messages (rare but possible)
// - With -z --raw, git uses double-NUL (\x00\x00) between commits - we leverage this pattern
export const NUL = '%x00'; // NUL byte - between ALL fields (git prevents NUL in commit content)

// Metadata format string for --pretty=format:
// All fields NUL-separated for robust parsing (git prevents NUL in commit content)
// Fields: hash, abbrevHash, parents, authorName, authorEmail, authorDate,
//         committerName, committerEmail, committerDate, subject, body
// With -z --raw, git adds NUL after each raw file entry and double-NUL between commits
const METADATA_FORMAT = `%H${NUL}%h${NUL}%P${NUL}%an${NUL}%ae${NUL}%aI${NUL}%cn${NUL}%ce${NUL}%cI${NUL}%s${NUL}%b${NUL}`;

export interface GitLogStructuredOptions {
  directory: string;
  range?: string;
  maxCommits?: number;
}

export interface GitLogTextBlobOptions extends GitLogStructuredOptions {
  patchDetail: 'patch' | 'stat' | 'shortstat' | 'dirstat' | 'numstat';
}

/** Pass 1: Structured metadata + files with -z --raw */
export const execGitLogStructured = async (
  options: GitLogStructuredOptions,
  deps = { execFileAsync },
): Promise<string> => {
  const args = ['-C', options.directory, 'log', '-z', '--raw', `--pretty=format:${METADATA_FORMAT}`];
  if (options.range) args.push(options.range);
  else if (options.maxCommits) args.push('-n', options.maxCommits.toString());

  try {
    return (await deps.execFileAsync('git', args)).stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git log structured:', (error as Error).message);
    throw error;
  }
};

/** Pass 2: Patch/stat text blob - uses double-NUL as record separator for consistency */
export const execGitLogTextBlob = async (options: GitLogTextBlobOptions, deps = { execFileAsync }): Promise<string> => {
  // Use double-NUL as separator - matches structured output format, 100% safe since git rejects NUL in content
  const args = ['-C', options.directory, 'log', `--pretty=format:${NUL}${NUL}`, `--${options.patchDetail}`];
  if (options.range) args.push(options.range);
  else if (options.maxCommits) args.push('-n', options.maxCommits.toString());

  try {
    return (await deps.execFileAsync('git', args)).stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git log text blob:', (error as Error).message);
    throw error;
  }
};

/** Graph visualization (separate call to avoid prefix interleaving) */
export const execGitGraph = async (options: GitLogStructuredOptions, deps = { execFileAsync }): Promise<string> => {
  const args = ['-C', options.directory, 'log', '--graph', '--oneline', '--all'];
  if (options.range) args.push(options.range);
  else if (options.maxCommits) args.push('-n', options.maxCommits.toString());

  try {
    return (await deps.execFileAsync('git', args)).stdout || '';
  } catch (error) {
    logger.trace('Failed to execute git graph:', (error as Error).message);
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
