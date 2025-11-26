import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { execGitGraph, execGitLog, execGitLogStructured, execGitLogTextBlob } from './gitCommand.js';
import {
  type CommitGraph,
  type CommitMetadata,
  generateMermaidGraph,
  getTags,
  type PatchDetailLevel,
} from './gitHistory.js';
import { isGitRepository } from './gitRepositoryHandle.js';

// Null character used as record separator in git log output for robust parsing
// This ensures commits are split correctly even when commit messages contain newlines
export const GIT_LOG_RECORD_SEPARATOR = '\x00';
export const GIT_LOG_FORMAT_SEPARATOR = '%x00';

// ===== Types =====

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
 * Git log result with optional graph and summary
 * - logCommits: always present, with progressive optional fields based on config
 * - graph: present when includeCommitGraph=true
 * - summary: present when includeSummary=true
 */
export interface GitLogResult {
  logCommits: GitLogCommit[];
  graph?: CommitGraph;
  summary?: HistorySummary;
}

/**
 * Git log commit with progressive optional fields
 *
 * Core fields (always present): date, message, files
 * Extended fields (when enhanced mode enabled): hash, author, committer, parents, body, patch
 */
export interface GitLogCommit {
  date: string;
  message: string;
  files: string[];
  hash?: string;
  abbreviatedHash?: string;
  author?: { name: string; email: string; date: string };
  committer?: { name: string; email: string; date: string };
  parents?: string[];
  body?: string;
  patch?: string;
}

// ===== Two-Pass Parser =====
//
// Architecture: Separates structured data from text blobs for robust parsing
// - Pass 1 (execGitLogStructured): NUL-terminated metadata + raw file entries
// - Pass 2 (execGitLogTextBlob): Patch/stat content matched by array index
// - Pass 3 (execGitGraph): Separate call avoids graph prefix interleaving
//
// NUL (\x00) is used as the ONLY delimiter because git REJECTS commits containing
// NUL bytes. This makes parsing 100% robust - NUL cannot appear in commit messages,
// author names, emails, or any other commit content.
//
// With -z --raw, git uses double-NUL (\x00\x00) between commits, providing a safe
// record separator that cannot be forged by commit content.

interface ParsedCommit {
  hash: string;
  abbrevHash: string;
  parents: string[];
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  message: string;
  body: string;
  files: string[];
  patch?: string;
}

// Pre-compiled regexes for performance
const HASH_REGEX = /^[0-9a-f]{40}$/i;
const ABBREV_HASH_REGEX = /^[0-9a-f]{4,12}$/i;

/** Fast check if string could be a 40-char hex hash (length + first char check before regex) */
const isHash = (s: string): boolean => s.length === 40 && HASH_REGEX.test(s);

/** Fast check if string looks like abbreviated hash sharing prefix with full hash */
const isAbbrevOf = (abbrev: string, full: string): boolean =>
  abbrev.length >= 4 && abbrev.length <= 12 && ABBREV_HASH_REGEX.test(abbrev) && full.startsWith(abbrev);

/**
 * Parse output from execGitLogStructured with optional patch content from execGitLogTextBlob
 *
 * Input format from -z --raw (all fields NUL-separated):
 * - Fields 0-10: hash, abbrevHash, parents, authorName, authorEmail, authorDate,
 *                committerName, committerEmail, committerDate, subject, body
 * - Fields 11+: Raw file entries ":mode mode blob blob STATUS" followed by filename
 * - Next commit starts when we see another 40-char hex hash
 *
 * NUL is 100% safe because git rejects commits containing NUL bytes in any content.
 * We parse incrementally rather than splitting on double-NUL since empty fields
 * also produce double-NUL sequences.
 */
const parseStructuredOutput = (output: string, patchOutput?: string): ParsedCommit[] => {
  if (!output) return [];

  // Split on single NUL - all fields are NUL-separated
  const parts = output.split('\x00');
  const patches = patchOutput ? patchOutput.split('\x00\x00').filter(Boolean) : [];
  const commits: ParsedCommit[] = [];
  let i = 0;

  while (i < parts.length) {
    // Find start of commit (40-char hex hash) - use length check first for speed
    const hashRaw = parts[i];
    if (!hashRaw) {
      i++;
      continue;
    }
    const hash = hashRaw.trim();
    if (!isHash(hash)) {
      i++;
      continue;
    }

    // Need at least 11 fields for metadata
    if (i + 10 >= parts.length) break;

    // Extract metadata fields - trim once and store
    const abbrev = parts[i + 1]?.trim() || '';
    const parents = parts[i + 2]?.trim() || '';
    const aName = parts[i + 3]?.trim() || '';
    const aEmail = parts[i + 4]?.trim() || '';
    const aDate = parts[i + 5]?.trim() || '';
    const cName = parts[i + 6]?.trim() || '';
    const cEmail = parts[i + 7]?.trim() || '';
    const cDate = parts[i + 8]?.trim() || '';
    const subject = parts[i + 9]?.trim() || '';
    const body = parts[i + 10]?.trim() || '';

    i += 11; // Move past metadata fields

    // Parse raw file entries until we hit the next commit or end
    // Raw entry format: ":mode mode blob blob STATUS" followed by filename
    const files: string[] = [];
    while (i < parts.length) {
      const partRaw = parts[i];
      if (!partRaw) {
        i++;
        continue;
      }

      // Check for raw entry (starts with ':') - most common case in file section
      const firstChar = partRaw[0];
      if (firstChar === ':' || (firstChar === '\n' && partRaw[1] === ':')) {
        i++;
        const filename = parts[i]?.trim();
        if (filename) files.push(filename);
        i++;
        continue;
      }

      // Check for next commit boundary - only if length matches hash (40 chars)
      const part = partRaw.trim();
      if (part.length === 40 && isHash(part)) {
        const nextPart = parts[i + 1]?.trim();
        if (nextPart && isAbbrevOf(nextPart, part)) {
          break; // This is definitely a new commit
        }
      }

      i++;
    }

    commits.push({
      hash,
      abbrevHash: abbrev,
      parents: parents.split(' ').filter(Boolean),
      author: { name: aName, email: aEmail, date: aDate },
      committer: { name: cName, email: cEmail, date: cDate },
      message: subject,
      body,
      files,
      ...(patches[commits.length] && { patch: patches[commits.length].trim() }),
    });
  }

  return commits;
};

// ===== Public API =====

export const getGitLog = async (
  directory: string,
  maxCommits: number,
  deps = { execGitLog, isGitRepository },
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
 *
 * Uses two-pass architecture:
 * - Pass 1: Always fetch structured metadata + file lists
 * - Pass 2: Fetch patch/stat content only if requested
 * - Pass 3: Fetch graph separately to avoid prefix interleaving
 */
export const getGitLogs = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = { execGitLogStructured, execGitLogTextBlob, execGitGraph, getTags, isGitRepository },
): Promise<GitLogResult | undefined> => {
  const gitConfig = config.output.git;
  if (!gitConfig?.includeLogs) return undefined;

  const gitRoot = rootDirs[0] || config.cwd;
  if (!(await deps.isGitRepository(gitRoot))) return undefined;

  try {
    const needsEnhanced = gitConfig.includeCommitGraph || gitConfig.includeCommitPatches || gitConfig.includeSummary;
    const range = needsEnhanced ? gitConfig.commitRange || 'HEAD~50..HEAD' : undefined;
    const maxCommits = gitConfig.includeLogsCount || 50;
    const patchTypes = ['patch', 'stat', 'shortstat', 'dirstat', 'numstat'];
    const needsPatch = gitConfig.includeCommitPatches && patchTypes.includes(gitConfig.commitPatchDetail || '');

    // Fetch data
    const structured = await deps.execGitLogStructured({ directory: gitRoot, range, maxCommits });
    const patchOutput = needsPatch
      ? await deps.execGitLogTextBlob({
          directory: gitRoot,
          range,
          maxCommits,
          patchDetail: gitConfig.commitPatchDetail as 'patch' | 'stat' | 'shortstat' | 'dirstat' | 'numstat',
        })
      : undefined;

    const commits = parseStructuredOutput(structured, patchOutput);
    logger.info(`✅ Fetched ${commits.length} commits`);

    // Map to output format
    const logCommits: GitLogCommit[] = commits.map((c) => ({
      date: c.author.date,
      message: c.message,
      files: c.files,
      ...(needsEnhanced && {
        hash: c.hash,
        abbreviatedHash: c.abbrevHash,
        author: c.author,
        committer: c.committer,
        parents: c.parents,
        body: c.body || undefined,
        patch: c.patch,
      }),
    }));

    // Graph (separate call)
    let graph: CommitGraph | undefined;
    if (gitConfig.includeCommitGraph) {
      const tags = gitConfig.includeGitTags !== false ? await deps.getTags(gitRoot) : {};
      const asciiGraph = await deps.execGitGraph({ directory: gitRoot, range, maxCommits });
      const metadata: CommitMetadata[] = commits.map((c) => ({
        hash: c.hash,
        abbreviatedHash: c.abbrevHash,
        parents: c.parents,
        author: c.author,
        committer: c.committer,
        message: c.message,
        body: c.body,
        files: c.files,
      }));
      graph = {
        commits: metadata,
        graph: asciiGraph,
        mermaidGraph: generateMermaidGraph(metadata, tags),
        mergeCommits: metadata.filter((c) => c.parents.length > 1).map((c) => c.hash),
        tags,
      };
    }

    // Summary
    const summary = gitConfig.includeSummary
      ? {
          totalCommits: commits.length,
          mergeCommits: commits.filter((c) => c.parents.length > 1).length,
          range: range || `last ${maxCommits} commits`,
          detailLevel: (gitConfig.commitPatchDetail as PatchDetailLevel) || 'name-only',
        }
      : undefined;

    return { logCommits, graph, summary };
  } catch (error) {
    if (error instanceof RepomixError) throw error;
    throw new RepomixError(`Failed to get git logs: ${(error as Error).message}`, { cause: error });
  }
};
