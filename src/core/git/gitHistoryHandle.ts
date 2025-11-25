import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import {
  type CommitGraph,
  type CommitMetadata,
  getCommitGraph,
  getCommitPatch,
  type PatchDetailLevel,
} from './gitHistory.js';
import { isGitRepository } from './gitRepositoryHandle.js';

/**
 * Complete forensics result for a single commit
 */
export interface HistoryCommitResult {
  metadata: CommitMetadata;
  patch: string;
}

/**
 * Summary statistics for forensics analysis
 */
export interface HistorySummary {
  totalCommits: number;
  mergeCommits: number;
  range: string;
  detailLevel: PatchDetailLevel;
}

/**
 * Complete git forensics result
 */
export interface GitHistoryResult {
  graph?: CommitGraph;
  commits: HistoryCommitResult[];
  summary: HistorySummary;
}

/**
 * Get comprehensive git forensics analysis
 */
export const getGitHistory = async (
  rootDirs: string[],
  config: RepomixConfigMerged,
  deps = {
    isGitRepository,
    getCommitGraph,
    getCommitPatch,
  },
): Promise<GitHistoryResult | undefined> => {
  // Only run if git commit history is explicitly enabled
  if (!config.output.git?.includeCommitHistory) {
    logger.trace('Git commit history analysis not enabled');
    return undefined;
  }

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
    const detailLevel = (config.output.git.commitPatchDetail as PatchDetailLevel) || 'stat';
    const includeGraph = config.output.git.includeCommitGraph !== false;
    const includeTags = config.output.git.includeGitTags !== false;
    const includePatches = config.output.git.includeCommitPatches !== false;

    logger.trace('Git history analysis configuration:', {
      range,
      detailLevel,
      includeGraph,
      includeTags,
      includePatches,
    });

    // Get commit graph (always fetch to get commit metadata and graph structure)
    // The includeGraph/includeGitTags flags control what appears in the output
    const graph = await deps.getCommitGraph(gitRoot, range);

    // Process each commit
    const commits: HistoryCommitResult[] = [];
    for (const metadata of graph.commits) {
      // Get patch if requested
      const patch = includePatches ? await deps.getCommitPatch(gitRoot, metadata.hash, detailLevel) : '';

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
    logger.trace('Failed to get git forensics:', (error as Error).message);
    throw new RepomixError(`Failed to get git forensics: ${(error as Error).message}`, { cause: error });
  }
};
