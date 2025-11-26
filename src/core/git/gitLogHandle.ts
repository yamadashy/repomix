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

// ===== Simple Log Mode Types =====

export interface GitLogCommit {
  date: string;
  message: string;
  files: string[];
}

export interface GitLogResult {
  logContent: string;
  commits: GitLogCommit[];
}

// ===== Comprehensive History Mode Types =====

/**
 * Complete result for a single commit with metadata and patch
 */
export interface HistoryCommitResult {
  metadata: CommitMetadata;
  patch: string;
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
 * Complete git history result with graph, commits, and summary
 */
export interface GitHistoryResult {
  graph?: CommitGraph;
  commits: HistoryCommitResult[];
  summary: HistorySummary;
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
 * Get simple git log with basic commit information
 * Used when only basic log output is needed without graphs or patches
 */
const getSimpleGitLogs = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    getGitLog,
  },
): Promise<GitLogResult | undefined> => {
  try {
    // Use the first directory as the git repository root
    const gitRoot = rootDirs[0] || config.cwd;
    const maxCommits = config.output.git?.includeLogsCount || 50;
    const logContent = await deps.getGitLog(gitRoot, maxCommits);

    // Parse the raw log content into structured commits
    const commits = parseGitLog(logContent);

    return {
      logContent,
      commits,
    };
  } catch (error) {
    throw new RepomixError(`Failed to get git logs: ${(error as Error).message}`, { cause: error });
  }
};

/**
 * Get comprehensive git history analysis with graphs, metadata, and patches
 * Used when detailed commit analysis is needed (graph visualization, patches, etc.)
 */
const getComprehensiveGitHistory = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    isGitRepository,
    getCommitGraph,
    getCommitPatch,
  },
): Promise<GitHistoryResult | undefined> => {
  try {
    // Use the first directory as the git repository root
    const gitRoot = rootDirs[0] || config.cwd;

    // Check if this is a git repository
    const isGitRepo = await deps.isGitRepository(gitRoot);
    if (!isGitRepo) {
      logger.trace(`Directory ${gitRoot} is not a git repository, skipping commit history analysis`);
      return undefined;
    }

    // Get configuration options with defaults
    const range = config.output.git.commitRange || 'HEAD~50..HEAD';
    const detailLevel = (config.output.git.commitPatchDetail as PatchDetailLevel) || 'name-only';
    const includeGraph = config.output.git.includeCommitGraph !== false;
    const includeTags = config.output.git.includeGitTags !== false;
    const includePatches = config.output.git.includeCommitPatches !== false;
    const includeSummary = config.output.git.includeSummary || false;

    logger.trace('Git history analysis configuration:', {
      range,
      detailLevel,
      includeGraph,
      includeTags,
      includePatches,
      includeSummary,
    });

    // Get commit graph (always fetch to get commit metadata and graph structure)
    // The includeGraph/includeGitTags flags control what appears in the output
    const graph = await deps.getCommitGraph(gitRoot, range);

    // Process each commit
    const commits: HistoryCommitResult[] = [];
    for (const metadata of graph.commits) {
      // Get patch if requested
      const patch = includePatches
        ? await deps.getCommitPatch(gitRoot, metadata.hash, detailLevel, includeSummary)
        : '';

      commits.push({
        metadata,
        patch,
      });
    }

    // Calculate summary statistics
    const summary: HistorySummary = {
      totalCommits: commits.length,
      mergeCommits: graph.mergeCommits.length,
      range,
      detailLevel,
    };

    logger.info(`✅ Git history analyzed ${commits.length} commits in range ${range}`);

    // Conditionally include graph visualization and tags based on config
    let outputGraph: CommitGraph | undefined = graph;
    if (!includeGraph) {
      // Don't include graph visualization at all
      outputGraph = undefined;
    } else if (!includeTags) {
      // Include graph but without tags
      outputGraph = {
        ...graph,
        tags: {},
      };
    }

    return {
      graph: outputGraph,
      commits,
      summary,
    };
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }
    logger.trace('Failed to get git history:', (error as Error).message);
    throw new RepomixError(`Failed to get git history: ${(error as Error).message}`, { cause: error });
  }
};

/**
 * Unified git logs handler - routes to simple or comprehensive mode based on config
 *
 * Returns simple logs when:
 * - includeLogs is true AND
 * - includeCommitGraph is false AND
 * - includeSummary is false
 *
 * Returns comprehensive history when:
 * - includeLogs is true AND
 * - (includeCommitGraph is true OR includeSummary is true)
 *
 * @returns GitLogResult for simple mode, GitHistoryResult for comprehensive mode
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
): Promise<GitLogResult | GitHistoryResult | undefined> => {
  // Only run if git logs are enabled
  if (!config.output.git?.includeLogs) {
    logger.trace('Git logs not enabled');
    return undefined;
  }

  // Determine which mode to use based on config
  const needsComprehensiveMode =
    config.output.git.includeCommitGraph === true || config.output.git.includeSummary === true;

  if (needsComprehensiveMode) {
    // Use comprehensive mode with graph, metadata, and patches
    return getComprehensiveGitHistory(rootDirs, config, {
      isGitRepository: deps.isGitRepository,
      getCommitGraph: deps.getCommitGraph,
      getCommitPatch: deps.getCommitPatch,
    });
  }

  // Use simple mode with basic log output
  return getSimpleGitLogs(rootDirs, config, {
    getGitLog: deps.getGitLog,
  });
};
