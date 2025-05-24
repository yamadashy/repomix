import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { parseRemoteValue } from './gitRemoteParse.js';

const execFileAsync = promisify(execFile);

/**
 * Checks if a directory is a git repository
 */
export const isGitRepository = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<boolean> => {
  try {
    await deps.execFileAsync('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Helper function to get git diff with common repository check and error handling
 */
export const getDiff = async (
  directory: string,
  options: string[],
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const isGitRepo = await isGitRepository(directory, deps);
    if (!isGitRepo) {
      logger.trace('Not a git repository, skipping diff generation');
      return '';
    }

    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'diff',
      '--no-color', // Avoid ANSI color codes
      ...options,
    ]);

    return result.stdout || '';
  } catch (error) {
    logger.trace('Failed to get git diff:', (error as Error).message);
    return '';
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

  if (!(url.startsWith('git@') || url.startsWith('https://'))) {
    throw new RepomixError(`Invalid URL protocol for '${url}'. URL must start with 'git@' or 'https://'`);
  }

  try {
    parseRemoteValue(url);
  } catch (error) {
    throw new RepomixError(`Invalid repository URL. Please provide a valid URL: ${url}`);
  }
};
