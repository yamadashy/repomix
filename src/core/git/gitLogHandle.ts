import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitLog, execGitLogComplete, type GitLogCompleteOptions } from './gitCommand.js';
import {
  type CommitGraph,
  type CommitMetadata,
  generateMermaidGraph,
  getCommitGraph,
  getCommitPatch,
  getTags,
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
 * - logCommits: array of commits with progressive optional fields
 * - graph: commit graph visualization when includeCommitGraph=true
 * - summary: statistics when includeSummary=true
 */
export interface GitLogResult {
  logCommits: GitLogCommit[];
  graph?: CommitGraph;
  summary?: HistorySummary;
}

/**
 * Git log commit with progressive optional fields
 *
 * Core fields (always present):
 * - date: commit date for display
 * - message: commit message
 * - files: list of changed files
 *
 * Extended fields (present when graph/summary/patches enabled):
 * - hash: full commit hash
 * - abbreviatedHash: short commit hash
 * - author: author information
 * - committer: committer information
 * - parents: parent commit hashes
 * - body: extended commit message
 * - patch: diff content
 */
export interface GitLogCommit {
  // Core fields - always present
  date: string;
  message: string;
  files: string[];

  // Extended fields - optional (when graph/summary/patches enabled)
  hash?: string;
  abbreviatedHash?: string;
  author?: {
    name: string;
    email: string;
    date: string;
  };
  committer?: {
    name: string;
    email: string;
    date: string;
  };
  parents?: string[];
  body?: string;
  patch?: string;
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

/**
 * Parsed commit from execGitLogComplete with all fields
 */
interface ParsedCommitComplete {
  hash: string;
  abbreviatedHash: string;
  parents: string[];
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  message: string;
  body: string;
  files: string[];
  patch?: string; // Present if patchDetail was specified
  graphPrefix?: string; // Present if --graph was used
}

/**
 * Parse git log output from execGitLogComplete
 * Handles interleaved metadata, files, patches, and graph prefixes
 */
const parseGitLogComplete = (
  rawOutput: string,
  options: {
    hasGraph: boolean;
    hasPatch: boolean;
    patchFormat?: string;
  },
): ParsedCommitComplete[] => {
  if (!rawOutput.trim()) {
    return [];
  }

  const RECORD_SEP = '\x1E';
  const FIELD_SEP = '\x1F';
  const NULL_BYTE = '\x00';

  const commits: ParsedCommitComplete[] = [];
  const records = rawOutput.split(RECORD_SEP).filter(Boolean);

  for (const record of records) {
    let graphPrefix = '';
    let content = record;

    // Extract graph prefix if present (lines before first field separator)
    if (options.hasGraph) {
      const lines = record.split('\n');
      const firstMetadataLine = lines.findIndex((l) => l.includes(FIELD_SEP));
      if (firstMetadataLine > 0) {
        graphPrefix = lines.slice(0, firstMetadataLine).join('\n');
        content = lines.slice(firstMetadataLine).join('\n');
      }
    }

    // Split metadata from files/patch section
    const [metadataSection, filesAndPatch] = content.split(NULL_BYTE);
    if (!metadataSection) continue;

    // Parse metadata fields (remove graph prefixes from each line)
    const fields = metadataSection.split(FIELD_SEP).map((f) => f.replace(/^[*|\/\\ ]+/, '').trim());

    if (fields.length < 11) continue; // Need all metadata fields

    const [
      hash,
      abbrevHash,
      parentsStr,
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      subject,
      ...bodyLines
    ] = fields;

    // Split files and patch (separated by blank lines)
    let files: string[] = [];
    let patch: string | undefined;

    if (filesAndPatch) {
      // Remove graph prefixes from file/patch section and normalize line endings
      const cleanedSection = filesAndPatch
        .split(/\r?\n/) // Handle both \n and \r\n
        .map((line) => line.replace(/^[*|\/\\ ]+/, ''))
        .join('\n');

      const sections = cleanedSection.split(/\n\n+/); // Split on blank lines
      const fileSection = sections[0];
      files = fileSection ? fileSection.split('\n').filter((l) => l.trim() !== '') : [];

      // Patch comes after files (if hasPatch)
      if (options.hasPatch && sections.length > 1) {
        patch = sections.slice(1).join('\n\n').trim();
      }
    }

    commits.push({
      hash: hash.trim(),
      abbreviatedHash: abbrevHash.trim(),
      parents: parentsStr ? parentsStr.trim().split(' ').filter(Boolean) : [],
      author: {
        name: authorName.trim(),
        email: authorEmail.trim(),
        date: authorDate.trim(),
      },
      committer: {
        name: committerName.trim(),
        email: committerEmail.trim(),
        date: committerDate.trim(),
      },
      message: subject.trim(),
      body: bodyLines.join('\n').trim(),
      files,
      patch,
      ...(options.hasGraph && { graphPrefix }),
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
    execGitLogComplete,
    getTags,
    isGitRepository,
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

    const gitConfig = config.output.git;

    // Determine if enhanced mode needed
    const needsEnhanced =
      gitConfig.includeCommitGraph === true ||
      gitConfig.includeCommitPatches === true ||
      gitConfig.includeSummary === true;

    const range = needsEnhanced ? (gitConfig.commitRange || 'HEAD~50..HEAD') : undefined;
    const maxCommits = gitConfig.includeLogsCount || 50;

    logger.trace('Fetching git logs (single optimized path)', {
      needsEnhanced,
      range,
      maxCommits,
      includeGraph: gitConfig.includeCommitGraph,
      includePatches: gitConfig.includeCommitPatches,
      includeSummary: gitConfig.includeSummary,
    });

    // SINGLE git log call with all requested features
    const rawOutput = await deps.execGitLogComplete({
      directory: gitRoot,
      range,
      maxCommits,
      includeGraph: gitConfig.includeCommitGraph === true,
      patchDetail: gitConfig.includeCommitPatches === true ? gitConfig.commitPatchDetail : undefined,
    });

    // Parse complete output
    const parsedCommits = parseGitLogComplete(rawOutput, {
      hasGraph: gitConfig.includeCommitGraph === true,
      hasPatch: gitConfig.includeCommitPatches === true,
      patchFormat: gitConfig.commitPatchDetail,
    });

    logger.info(`✅ Fetched ${parsedCommits.length} commits`);

    // Map to GitLogCommit with progressive disclosure
    const logCommits: GitLogCommit[] = parsedCommits.map((commit) => ({
      // Core fields - always present
      date: commit.author.date,
      message: commit.message,
      files: commit.files,
      // Extended fields - only when enhanced mode
      ...(needsEnhanced && {
        hash: commit.hash,
        abbreviatedHash: commit.abbreviatedHash,
        author: commit.author,
        committer: commit.committer,
        parents: commit.parents,
        body: commit.body || undefined,
        patch: commit.patch || undefined,
      }),
    }));

    // Build graph if requested
    let graph: CommitGraph | undefined;
    if (gitConfig.includeCommitGraph === true) {
      const includeTags = gitConfig.includeGitTags !== false;
      const tags = includeTags ? await deps.getTags(gitRoot) : {};

      // Reconstruct ASCII graph from prefixes
      const asciiGraph = parsedCommits.map((c) => c.graphPrefix).filter(Boolean).join('\n');

      // Build metadata array for graph
      const commitMetadata: CommitMetadata[] = parsedCommits.map((c) => ({
        hash: c.hash,
        abbreviatedHash: c.abbreviatedHash,
        parents: c.parents,
        author: c.author,
        committer: c.committer,
        message: c.message,
        body: c.body,
        files: c.files,
      }));

      const mergeCommits = commitMetadata.filter((c) => c.parents.length > 1).map((c) => c.hash);

      const mermaidGraph = generateMermaidGraph(commitMetadata, tags);

      graph = {
        commits: commitMetadata,
        graph: asciiGraph,
        mermaidGraph,
        mergeCommits,
        tags,
      };
    }

    // Build summary if requested
    const summary = gitConfig.includeSummary === true
      ? {
          totalCommits: logCommits.length,
          mergeCommits: parsedCommits.filter((c) => c.parents.length > 1).length,
          range: range || `last ${maxCommits} commits`,
          detailLevel: (gitConfig.commitPatchDetail as PatchDetailLevel) || 'name-only',
        }
      : undefined;

    return { logCommits, graph, summary };
  } catch (error) {
    if (error instanceof RepomixError) {
      throw error;
    }
    const errorMessage = (error as Error).message;
    logger.trace('Failed to get git logs:', errorMessage);
    throw new RepomixError(`Failed to get git logs: ${errorMessage}`, { cause: error });
  }
};
