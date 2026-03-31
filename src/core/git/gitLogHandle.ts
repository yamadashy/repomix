import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitLog } from './gitCommand.js';
import { isGitRepository } from './gitRepositoryHandle.js';

// Null character used as record separator in git log output for robust parsing
// This ensures commits are split correctly even when commit messages contain newlines
export const GIT_LOG_RECORD_SEPARATOR = '\x00';

// Git format string for null character separator
// Git expects %x00 format in pretty format strings
export const GIT_LOG_FORMAT_SEPARATOR = '%x00';

export interface GitLogCommit {
  date: string;
  message: string;
  files: string[];
}

export interface GitLogResult {
  logContent: string;
  commits: GitLogCommit[];
}

const parseGitLog = (rawLogOutput: string, recordSeparator = GIT_LOG_RECORD_SEPARATOR): GitLogCommit[] => {
  if (!rawLogOutput.trim()) {
    return [];
  }

  const commits: GitLogCommit[] = [];
  // Split by record separator used in git log output
  // This is more robust than splitting by double newlines, as commit messages may contain newlines
  const logEntries = rawLogOutput.split(recordSeparator).filter(Boolean);

  for (const entry of logEntries) {
    // Split on both \n and \r\n to handle different line ending formats across platforms
    const lines = entry.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length === 0) continue;

    // First line contains date and message separated by |
    const firstLine = lines[0];
    const separatorIndex = firstLine.indexOf('|');
    if (separatorIndex === -1) continue;

    const date = firstLine.substring(0, separatorIndex);
    const message = firstLine.substring(separatorIndex + 1);

    // Remaining lines are file paths
    const files = lines.slice(1).filter((line) => line.trim() !== '');

    commits.push({
      date,
      message,
      files,
    });
  }

  return commits;
};

export const getGitLog = async (
  directory: string,
  maxCommits: number,
  deps = {
    execGitLog,
    isGitRepository,
  },
): Promise<string> => {
  if (!(await deps.isGitRepository(directory))) {
    logger.trace(`Directory ${directory} is not a git repository`);
    return '';
  }

  try {
    return await deps.execGitLog(directory, maxCommits, GIT_LOG_FORMAT_SEPARATOR);
  } catch (error) {
    logger.trace('Failed to get git log:', (error as Error).message);
    throw error;
  }
};

export const getGitLogs = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  sortMaxCommits?: number,
  deps = {
    getGitLog,
  },
): Promise<GitLogResult | undefined> => {
  // Get git logs if enabled
  let gitLogResult: GitLogResult | undefined;

  if (config.output.git?.includeLogs) {
    try {
      // Use the first directory as the git repository root
      // Usually this would be the root of the project
      const gitRoot = rootDirs[0] || config.cwd;
      const displayCount = config.output.git?.includeLogsCount || 50;
      // Fetch enough commits for both display and sorting in a single subprocess.
      // When sortByChanges needs more commits than display (e.g., 100 vs 50),
      // this eliminates a separate getFileChangeCount subprocess (~80ms).
      const fetchCount = sortMaxCommits ? Math.max(displayCount, sortMaxCommits) : displayCount;
      const rawLogContent = await deps.getGitLog(gitRoot, fetchCount);

      // Parse the raw log content into structured commits
      const allCommits = parseGitLog(rawLogContent);

      // Truncate logContent and display commits to the configured display count
      // so that output is unchanged (only displayCount commits appear in the output).
      // Extra commits beyond displayCount are only used for sortByChanges derivation.
      let logContent = rawLogContent;
      if (allCommits.length > displayCount) {
        const entries = rawLogContent.split(GIT_LOG_RECORD_SEPARATOR).filter(Boolean);
        logContent = entries.slice(0, displayCount).join(GIT_LOG_RECORD_SEPARATOR);
      }

      gitLogResult = {
        logContent,
        commits: allCommits,
      };
    } catch (error) {
      throw new RepomixError(`Failed to get git logs: ${(error as Error).message}`, { cause: error });
    }
  }

  return gitLogResult;
};
