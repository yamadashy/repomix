import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitLog } from './gitCommand.js';
import {
  type CommitGraph,
  type CommitMetadata,
  getCommitGraph,
  getCommitPatch,
  type PatchDetailLevel,
} from './gitHistory.js';
import { isGitRepository } from './gitRepositoryHandle.js';

// Null character used as record separator in git log output for robust parsing
// This ensures commits are split correctly even when commit messages contain newlines
export const GIT_LOG_RECORD_SEPARATOR = '\x00';

// Git format string for null character separator
// Git expects %x00 format in pretty format strings
export const GIT_LOG_FORMAT_SEPARATOR = '%x00';

// ===== Git Log Result Types =====

/**
 * Single commit with metadata and optional patch diff
 */
export interface HistoryCommitResult {
  metadata: CommitMetadata;
  patch?: string;
}

/**
 * Summary statistics for git history analysis
 */
export interface HistorySummary {
  totalCommits: number;
  mergeCommits: number;
  range: string;
  detailLevel: PatchDetailLevel;
}

/**
 * Git log result with additive optional fields
 *
 * Structure is naturally backward and forward compatible:
 * - logContent: raw git log string when fetched via git log command
 * - commits: always present, contains commit metadata
 * - graph: commit graph visualization when includeCommitGraph=true
 * - summary: statistics when includeSummary=true
 */
export interface GitLogResult {
  logContent?: string;
  commits: HistoryCommitResult[];
  graph?: CommitGraph;
  summary?: HistorySummary;
}

/**
 * @deprecated Use HistoryCommitResult instead
 * Commit info for git log command output parsing
 */
export interface GitLogCommit {
  date: string;
  message: string;
  files: string[];
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

/**
 * Get git logs with optional graph, patches, and summary
 * Returns GitLogResult with fields populated based on config
 */
export const getGitLogs = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    getGitLog,
    isGitRepository,
    getCommitGraph,
    getCommitPatch,
  },
): Promise<GitLogResult | undefined> => {
  if (!config.output.git?.includeLogs) {
    logger.trace('Git logs not enabled');
    return undefined;
  }

  try {
    const gitRoot = rootDirs[0] || config.cwd;

    if (!(await deps.isGitRepository(gitRoot))) {
      logger.trace(`Directory ${gitRoot} is not a git repository`);
      return undefined;
    }

    const includeGraph = config.output.git.includeCommitGraph === true;
    const includePatches = config.output.git.includeCommitPatches === true;
    const includeSummary = config.output.git.includeSummary === true;

    // Use git log --graph when graph, patches, or summary requested
    if (includeGraph || includePatches || includeSummary) {
      const range = config.output.git.commitRange || 'HEAD~50..HEAD';
      const detailLevel = (config.output.git.commitPatchDetail as PatchDetailLevel) || 'name-only';
      const includeTags = config.output.git.includeGitTags !== false;

      logger.trace('Fetching git log with graph', {
        range,
        detailLevel,
        includeGraph,
        includeTags,
        includePatches,
        includeSummary,
      });

      const graph = await deps.getCommitGraph(gitRoot, range);
      const commits: HistoryCommitResult[] = [];

      for (const metadata of graph.commits) {
        const patch = includePatches
          ? await deps.getCommitPatch(gitRoot, metadata.hash, detailLevel, includeSummary)
          : undefined;
        commits.push({ metadata, patch });
      }

      logger.info(`✅ Analyzed ${commits.length} commits in range ${range}`);

      return {
        commits,
        graph: includeGraph ? (includeTags ? graph : { ...graph, tags: {} }) : undefined,
        summary: includeSummary
          ? {
              totalCommits: commits.length,
              mergeCommits: graph.mergeCommits.length,
              range,
              detailLevel,
            }
          : undefined,
      };
    }

    // Use git log command for basic commit history
    const maxCommits = config.output.git?.includeLogsCount || 50;
    const logContent = await deps.getGitLog(gitRoot, maxCommits);
    const parsedCommits = parseGitLog(logContent);

    const commits: HistoryCommitResult[] = parsedCommits.map((commit) => ({
      metadata: {
        hash: '',
        abbreviatedHash: '',
        parents: [],
        author: { name: '', email: '', date: commit.date },
        committer: { name: '', email: '', date: commit.date },
        message: commit.message,
        body: '',
        files: commit.files,
      },
      patch: undefined,
    }));

    logger.info(`✅ Fetched ${commits.length} commits`);

    return { commits, logContent };
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }
    const errorMessage = (error as Error).message;
    logger.trace('Failed to get git logs:', errorMessage);
    throw new RepomixError(`Failed to get git logs: ${errorMessage}`, { cause: error });
  }
};
