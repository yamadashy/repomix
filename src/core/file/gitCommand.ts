import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

export const getFileChangeCount = async (
  directory: string,
  maxCommits = 100,
  deps = {
    execFileAsync,
  },
): Promise<Record<string, number>> => {
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

    const fileChangeCounts: Record<string, number> = {};
    const lines = result.stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      fileChangeCounts[line] = (fileChangeCounts[line] || 0) + 1;
    }

    return fileChangeCounts;
  } catch (error) {
    logger.trace('Failed to get file change counts:', (error as Error).message);
    return {};
  }
};

export const getWorkTreeDiff = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  return getDiff(directory, [], deps);
};

export const getStagedDiff = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  return getDiff(directory, ['--cached'], deps);
};

/**
 * Helper function to get git diff with common repository check and error handling
 */
const getDiff = async (
  directory: string,
  options: string[],
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    // Check if the directory is a git repository
    const isGitRepo = await isGitRepository(directory, deps);
    if (!isGitRepo) {
      logger.trace('Not a git repository, skipping diff generation');
      return '';
    }

    // Get the diff with provided options
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

export const isGitRepository = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<boolean> => {
  try {
    // Check if the directory is a git repository
    await deps.execFileAsync('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']);
    return true;
  } catch (error) {
    return false;
  }
};

export const isGitInstalled = async (
  deps = {
    execFileAsync,
  },
) => {
  try {
    const result = await deps.execFileAsync('git', ['--version']);
    return !result.stderr;
  } catch (error) {
    logger.trace('Git is not installed:', (error as Error).message);
    return false;
  }
};

export const execGitShallowClone = async (
  url: string,
  directory: string,
  remoteBranch?: string,
  deps = {
    execFileAsync,
  },
): Promise<{
  repoUrl: string;
  remoteBranch: string | undefined;
  filePath: string | undefined;
  repoOwner: string;
  repoName: string;
}> => {
  if (url.includes('--upload-pack') || url.includes('--config') || url.includes('--exec')) {
    throw new RepomixError('URL contains potentially unsafe parameters');
  }

  let urlObj: URL;
  try {
    urlObj = new URL(url);

    if (!['http:', 'https:', 'git:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }
  } catch (error) {
    throw new RepomixError(`Invalid repository URL. Please provide a valid URL. url: ${url}`);
  }

  if (typeof directory !== 'string' || !directory.trim()) {
    throw new RepomixError('Invalid directory path');
  }

  if (directory.includes(';') || directory.includes('&') || directory.includes('|') || 
      directory.includes('>') || directory.includes('<') || directory.includes('`')) {
    throw new RepomixError('Directory path contains invalid characters');
  }

  if (remoteBranch !== undefined) {
    if (typeof remoteBranch !== 'string') {
      throw new RepomixError('Invalid branch name');
    }
    
    if (remoteBranch.includes(';') || remoteBranch.includes('&') || remoteBranch.includes('|') || 
        remoteBranch.includes('>') || remoteBranch.includes('<') || remoteBranch.includes('`')) {
      throw new RepomixError('Branch name contains invalid characters');
    }
  }

  const cloneArgs = ['clone', '--depth', '1'];

  cloneArgs.push(url);
  cloneArgs.push(directory);

  await deps.execFileAsync('git', cloneArgs);

  const pathParts = urlObj.pathname.split('/').filter((part) => part.trim());
  const repoOwner = pathParts[0] || '';
  const repoName = (pathParts[1] || '').replace(/\.git$/, '');

  let finalRemoteBranch: string | undefined = undefined;
  let filePath: string | undefined = undefined;

  if (remoteBranch) {
    const { stdout } = await deps.execFileAsync('git', ['-C', directory, 'ls-remote', '--heads', 'origin']);

    const availableBranches = stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split('refs/heads/');
        return parts.length > 1 ? parts[1] : null;
      })
      .filter((branch): branch is string => branch !== null);

    logger.trace(`Available branches: ${availableBranches.join(', ')}`);

    if (remoteBranch.includes('/')) {
      const pathParts = remoteBranch.split('/');
      const possibleBranches: string[] = [];

      for (let i = pathParts.length; i > 0; i--) {
        const potentialBranch = pathParts.slice(0, i).join('/');
        possibleBranches.push(potentialBranch);
      }

      const matchedBranch = possibleBranches.find((branch) => availableBranches.includes(branch));

      if (matchedBranch) {
        finalRemoteBranch = matchedBranch;

        // If the matched branch is shorter than the full path, the rest is the file path
        if (matchedBranch.length < remoteBranch.length) {
          filePath = remoteBranch.substring(matchedBranch.length + 1); // +1 for the slash
        }
      } else {
        const isCommitHash = remoteBranch.match(/^[0-9a-f]{4,40}$/i);
        if (isCommitHash) {
          finalRemoteBranch = remoteBranch;
        } else {
          throw new RepomixError(`Could not find branch: ${remoteBranch}`);
        }
      }
    } else {
      if (availableBranches.includes(remoteBranch)) {
        finalRemoteBranch = remoteBranch;
      } else {
        const isCommitHash = remoteBranch.match(/^[0-9a-f]{4,40}$/i);
        if (isCommitHash) {
          finalRemoteBranch = remoteBranch;
        } else {
          throw new RepomixError(`Could not find branch: ${remoteBranch}`);
        }
      }
    }

    try {
      if (finalRemoteBranch) {
        await deps.execFileAsync('git', ['-C', directory, 'reset', '--hard']);

        try {
          if (!finalRemoteBranch.match(/^[0-9a-zA-Z\/_.-]+$/)) {
            throw new RepomixError(`Invalid branch or commit name: ${finalRemoteBranch}`);
          }

          await deps.execFileAsync('git', ['-C', directory, 'checkout', finalRemoteBranch]);
        } catch (err) {
          try {
            await deps.execFileAsync('git', ['-C', directory, 'fetch', 'origin']);

            if (!finalRemoteBranch.match(/^[0-9a-zA-Z\/_.-]+$/)) {
              throw new RepomixError(`Invalid branch or commit name: ${finalRemoteBranch}`);
            }

            await deps.execFileAsync('git', ['-C', directory, 'checkout', finalRemoteBranch]);
          } catch (fetchErr) {
            throw new RepomixError(`Failed to checkout branch or commit: ${finalRemoteBranch}`);
          }
        }
      }
    } catch (err) {
      // Clean up .git directory even if checkout fails
      try {
        await fs.rm(path.join(directory, '.git'), { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.trace('Failed to clean up .git directory:', (cleanupErr as Error).message);
      }

      throw new RepomixError(`Failed to checkout branch or commit: ${finalRemoteBranch}`);
    }
  }

  try {
    // Clean up .git directory
    await fs.rm(path.join(directory, '.git'), { recursive: true, force: true });
  } catch (cleanupErr) {
    logger.trace('Failed to clean up .git directory:', (cleanupErr as Error).message);
  }

  return {
    repoUrl: url,
    remoteBranch: finalRemoteBranch,
    filePath,
    repoOwner,
    repoName,
  };
};
