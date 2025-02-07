import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

export interface GitFileMetric {
  path: string;
  changes: number;
}

export interface GitMetricsResult {
  totalCommits: number;
  mostChangedFiles: GitFileMetric[];
  error?: string;
}

// Check if git is installed
export const isGitInstalled = async (
  deps = {
    execFileAsync,
  },
): Promise<boolean> => {
  try {
    const result = await deps.execFileAsync('git', ['--version']);
    return !result.stderr;
  } catch (error) {
    logger.debug('Git is not installed:', (error as Error).message);
    return false;
  }
};

// Check if directory is a git repository
export const isGitRepository = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<boolean> => {
  try {
    await deps.execFileAsync('git', ['-C', directory, 'rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
};

// Get file change count from git log
export const calculateGitMetrics = async (
  rootDir: string,
  maxCommits: number,
  deps = {
    execFileAsync,
    isGitInstalled,
    isGitRepository,
  },
): Promise<GitMetricsResult> => {
  try {
    // Check if git is installed
    if (!(await deps.isGitInstalled())) {
      return {
        totalCommits: 0,
        mostChangedFiles: [],
        error: 'Git is not installed',
      };
    }

    // Check if directory is a git repository
    if (!(await deps.isGitRepository(rootDir))) {
      return {
        totalCommits: 0,
        mostChangedFiles: [],
        error: 'Not a Git repository',
      };
    }

    // Get file changes from git log
    const { stdout } = await deps.execFileAsync('git', [
      '-C',
      rootDir,
      'log',
      '--name-only',
      '--pretty=format:',
      `-n ${maxCommits}`,
    ]);

    // Process the output
    const files = stdout
      .split('\n')
      .filter(Boolean)
      .reduce<Record<string, number>>((acc, file) => {
        acc[file] = (acc[file] || 0) + 1;
        return acc;
      }, {});

    // Convert to array and sort
    const sortedFiles = Object.entries(files)
      .map(
        ([path, changes]): GitFileMetric => ({
          path,
          changes,
        }),
      )
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 5); // Get top 5 most changed files

    // Get total number of commits
    const { stdout: commitCountStr } = await deps.execFileAsync('git', [
      '-C',
      rootDir,
      'rev-list',
      '--count',
      'HEAD',
      `-n ${maxCommits}`,
    ]);

    const totalCommits = Math.min(Number.parseInt(commitCountStr.trim(), 10), maxCommits);

    return {
      totalCommits,
      mostChangedFiles: sortedFiles,
    };
  } catch (error) {
    logger.error('Error calculating git metrics:', error);
    return {
      totalCommits: 0,
      mostChangedFiles: [],
      error: 'Failed to calculate git metrics',
    };
  }
};
