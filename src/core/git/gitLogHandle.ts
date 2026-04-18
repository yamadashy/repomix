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
  allCommits?: GitLogCommit[];
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
  deps = {
    getGitLog,
  },
): Promise<GitLogResult | undefined> => {
  if (!config.output.git?.includeLogs) {
    return undefined;
  }

  try {
    const gitRoot = rootDirs[0] || config.cwd;
    const logMaxCommits = config.output.git?.includeLogsCount || 50;

    // When sortByChanges is also enabled, fetch enough commits for both
    // features from a single git process instead of spawning two.
    const sortMaxCommits = config.output.git?.sortByChangesMaxCommits ?? 100;
    const fetchMaxCommits = config.output.git?.sortByChanges ? Math.max(logMaxCommits, sortMaxCommits) : logMaxCommits;

    const fullLogContent = await deps.getGitLog(gitRoot, fetchMaxCommits);
    const allCommits = parseGitLog(fullLogContent);

    if (fetchMaxCommits <= logMaxCommits || allCommits.length <= logMaxCommits) {
      return { logContent: fullLogContent, commits: allCommits };
    }

    const commits = allCommits.slice(0, logMaxCommits);
    const records = fullLogContent.split(GIT_LOG_RECORD_SEPARATOR).filter(Boolean);
    const logContent =
      records.length > logMaxCommits
        ? GIT_LOG_RECORD_SEPARATOR + records.slice(0, logMaxCommits).join(GIT_LOG_RECORD_SEPARATOR)
        : fullLogContent;

    return { logContent, commits, allCommits };
  } catch (error) {
    throw new RepomixError(`Failed to get git logs: ${(error as Error).message}`, { cause: error });
  }
};
