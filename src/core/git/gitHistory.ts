import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';

const execFileAsync = promisify(execFile);

/**
 * Commit metadata with full information
 */
export interface CommitMetadata {
  hash: string;
  abbreviatedHash: string;
  parents: string[];
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
  body: string;
  files: string[];
}

/**
 * Commit graph with topology information
 */
export interface CommitGraph {
  commits: CommitMetadata[];
  graph: string; // ASCII art graph
  mermaidGraph: string; // Mermaid diagram
  mergeCommits: string[];
  tags: Record<string, string>; // tag name -> commit hash
}

/**
 * Parsed commit range
 */
export interface ParsedCommitRange {
  from: string;
  to: string;
  raw: string;
}

/**
 * Detail level for patches (matching git log parameters)
 */
export type PatchDetailLevel =
  | 'patch' // git log --patch: line-by-line diffs
  | 'stat' // git log --stat: diffstat histogram
  | 'numstat' // git log --numstat: numeric additions/deletions
  | 'shortstat' // git log --shortstat: one-line summary
  | 'dirstat' // git log --dirstat: directory distribution
  | 'name-only' // git log --name-only: filenames only
  | 'name-status' // git log --name-status: filenames with status
  | 'raw'; // git log --raw: low-level format

/**
 * Parse and validate a commit range
 * Supports: HEAD~10..HEAD, tag1..tag2, branch1..branch2, commit1..commit2
 */
export const parseCommitRange = (range: string): ParsedCommitRange => {
  if (!range || typeof range !== 'string') {
    throw new RepomixError('Commit range must be a non-empty string');
  }

  // Handle single commit (treated as commit^..commit)
  if (!range.includes('..')) {
    return {
      from: `${range}^`,
      to: range,
      raw: range,
    };
  }

  // Handle range formats
  const [from, to] = range.split('..');

  if (!from || !to) {
    throw new RepomixError(`Invalid commit range format: '${range}'. Expected format: 'from..to'`);
  }

  return {
    from: from.trim(),
    to: to.trim(),
    raw: range,
  };
};

// Null byte delimiter (via git's %x00) to separate format output from --name-only file list
// Null bytes cannot appear in commit messages or file paths, making this a reliable delimiter
const NULL_BYTE = '\0';

/**
 * Get full metadata for a specific commit
 */
export const getCommitMetadata = async (
  directory: string,
  hash: string,
  deps = {
    execFileAsync,
  },
): Promise<CommitMetadata> => {
  try {
    // Get commit metadata with fuller format showing author and committer
    // Use %x00 (null byte) as delimiter - it cannot appear in commit messages or file paths
    const formatString = [
      '%H', // Full hash
      '%h', // Abbreviated hash
      '%P', // Parent hashes (space-separated)
      '%an', // Author name
      '%ae', // Author email
      '%aI', // Author date (ISO 8601)
      '%cn', // Committer name
      '%ce', // Committer email
      '%cI', // Committer date (ISO 8601)
      '%s', // Subject (first line of message)
      '%b', // Body (rest of message)
      '%x00', // Null byte delimiter before file list (git format specifier)
    ].join('%n');

    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '-1',
      `--pretty=format:${formatString}`,
      '--name-only',
      hash,
    ]);

    // Split on null byte to separate format output from file list
    const [formatOutput, fileListOutput] = result.stdout.split(NULL_BYTE);

    const lines = formatOutput.split('\n');

    if (lines.length < 10) {
      throw new RepomixError(`Invalid git log output for commit ${hash}`);
    }

    const [
      fullHash,
      abbrevHash,
      parents,
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      subject,
    ] = lines.slice(0, 10);

    // Lines after subject (index 10+) are the body
    const body = lines.slice(10).join('\n').trim();

    // Files come after the delimiter
    const files = fileListOutput ? fileListOutput.split('\n').filter(Boolean) : [];

    return {
      hash: fullHash,
      abbreviatedHash: abbrevHash,
      parents: parents ? parents.split(' ').filter(Boolean) : [],
      author: {
        name: authorName,
        email: authorEmail,
        date: authorDate,
      },
      committer: {
        name: committerName,
        email: committerEmail,
        date: committerDate,
      },
      message: subject,
      body,
      files,
    };
  } catch (error) {
    logger.trace('Failed to get commit metadata:', (error as Error).message);
    throw new RepomixError(`Failed to get commit metadata for ${hash}: ${(error as Error).message}`);
  }
};

/**
 * Get commit graph with topology
 */
export const getCommitGraph = async (
  directory: string,
  range: string,
  deps = {
    execFileAsync,
    parseCommitRange,
    getCommitMetadata,
    getTags,
  },
): Promise<CommitGraph> => {
  try {
    const parsedRange = deps.parseCommitRange(range);

    // Get ASCII graph
    const graphResult = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '--graph',
      '--oneline',
      '--decorate',
      '--all',
      `${parsedRange.from}..${parsedRange.to}`,
    ]);

    // Get list of commit hashes in range
    const hashesResult = await deps.execFileAsync('git', [
      '-C',
      directory,
      'log',
      '--pretty=format:%H',
      `${parsedRange.from}..${parsedRange.to}`,
    ]);

    const hashes = hashesResult.stdout.split('\n').filter(Boolean);

    // Get metadata for each commit
    const commits = await Promise.all(hashes.map((hash) => deps.getCommitMetadata(directory, hash)));

    // Identify merge commits (commits with multiple parents)
    const mergeCommits = commits.filter((c) => c.parents.length > 1).map((c) => c.hash);

    // Get tags
    const tags = await deps.getTags(directory);

    // Generate Mermaid graph
    const mermaidGraph = generateMermaidGraph(commits, tags);

    return {
      commits,
      graph: graphResult.stdout,
      mermaidGraph,
      mergeCommits,
      tags,
    };
  } catch (error) {
    logger.trace('Failed to get commit graph:', (error as Error).message);
    throw new RepomixError(`Failed to get commit graph: ${(error as Error).message}`);
  }
};

/**
 * Get git tags mapping
 */
export const getTags = async (
  directory: string,
  deps = {
    execFileAsync,
  },
): Promise<Record<string, string>> => {
  try {
    const result = await deps.execFileAsync('git', [
      '-C',
      directory,
      'tag',
      '-l',
      '--format=%(refname:short) %(objectname)',
    ]);

    const tags: Record<string, string> = {};
    const lines = result.stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      const [tag, hash] = line.split(' ');
      if (tag && hash) {
        tags[tag] = hash;
      }
    }

    return tags;
  } catch (error) {
    logger.trace('Failed to get tags:', (error as Error).message);
    return {};
  }
};

/**
 * Get patch for a commit with configurable detail level
 */
export const getCommitPatch = async (
  directory: string,
  hash: string,
  detailLevel: PatchDetailLevel = 'stat',
  includeSummary = false,
  deps = {
    execFileAsync,
  },
): Promise<string> => {
  try {
    const args = ['-C', directory, 'show', '--no-color'];

    switch (detailLevel) {
      case 'patch':
        // Full patch with line-by-line diffs (git log --patch)
        args.push('--patch');
        break;
      case 'stat':
        // Diffstat histogram (git log --stat)
        args.push('--stat');
        break;
      case 'numstat':
        // Numeric additions/deletions per file (git log --numstat)
        args.push('--numstat');
        break;
      case 'shortstat':
        // One-line summary of changes (git log --shortstat)
        args.push('--shortstat');
        break;
      case 'dirstat':
        // Directory change distribution (git log --dirstat)
        args.push('--dirstat');
        break;
      case 'name-only':
        // Filenames only (git log --name-only)
        args.push('--name-only');
        break;
      case 'name-status':
        // Filenames with A/M/D/R status (git log --name-status)
        args.push('--name-status');
        break;
      case 'raw':
        // Low-level format with SHA hashes and modes (git log --raw)
        args.push('--raw');
        break;
      default:
        throw new RepomixError(`Invalid detail level: ${detailLevel}`);
    }

    // Add --summary flag if requested (shows file operations like creates, renames, mode changes)
    if (includeSummary) {
      args.push('--summary');
    }

    args.push(hash);

    const result = await deps.execFileAsync('git', args);
    return result.stdout;
  } catch (error) {
    logger.trace('Failed to get commit patch:', (error as Error).message);
    throw new RepomixError(`Failed to get patch for commit ${hash}: ${(error as Error).message}`);
  }
};

/**
 * Escape special characters for Mermaid string literals
 */
const escapeMermaidString = (str: string): string => {
  return str.replace(/"/g, "'").replace(/\n/g, ' ');
};

/**
 * Generate Mermaid diagram from commits
 * Note: Mermaid gitGraph has limited syntax - it doesn't support arbitrary
 * commit histories with merge visualization without branch context.
 * We generate a simplified linear view with merge indicators.
 */
export const generateMermaidGraph = (commits: CommitMetadata[], tags: Record<string, string>): string => {
  const lines: string[] = [];
  lines.push('gitGraph');

  // Reverse to show oldest first
  const reversed = [...commits].reverse();

  for (const commit of reversed) {
    const shortHash = commit.abbreviatedHash;
    // Escape quotes and limit message length
    const shortMessage = escapeMermaidString(commit.message.substring(0, 40));

    // Check if this commit has a tag
    const tagForCommit = Object.entries(tags).find(([, hash]) => hash === commit.hash)?.[0];

    // Build commit line with optional tag
    // Mermaid syntax: commit id: "..." [tag: "..."] [type: ...]
    const isMerge = commit.parents.length > 1;
    const messageWithMerge = isMerge ? `(merge) ${shortMessage}` : shortMessage;
    const commitId = `${shortHash}: ${messageWithMerge}`;

    let commitLine = `  commit id: "${commitId}"`;
    if (tagForCommit) {
      commitLine += ` tag: "${escapeMermaidString(tagForCommit)}"`;
    }
    if (isMerge) {
      commitLine += ' type: HIGHLIGHT';
    }

    lines.push(commitLine);
  }

  return lines.join('\n');
};
