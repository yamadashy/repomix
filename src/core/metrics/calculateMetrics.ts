import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger, repomixLogLevels } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';
import { TokenCounter } from './TokenCounter.js';
import type { FileMetrics } from './workers/types.js';

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

export interface PrecomputedMetrics {
  fileMetrics: FileMetrics[];
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

const defaultMetricsDeps = {
  calculateSelectiveFileMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  tokenCounter: undefined as TokenCounter | undefined,
  precomputedMetrics: undefined as PrecomputedMetrics | undefined,
};

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  output: string | string[],
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  overrideDeps: Partial<typeof defaultMetricsDeps> = {},
): Promise<CalculateMetricsResult> => {
  const deps = { ...defaultMetricsDeps, ...overrideDeps };
  progressCallback('Calculating metrics...');

  const outputParts = Array.isArray(output) ? output : [output];

  let selectiveFileMetrics: FileMetrics[];
  let gitDiffTokenCount: number;
  let gitLogTokenCount: number;

  if (deps.precomputedMetrics) {
    // Use pre-computed metrics from parallel execution with security check.
    // File token counting and git token counting were already completed on the
    // main thread while security workers ran in parallel.
    selectiveFileMetrics = deps.precomputedMetrics.fileMetrics;
    gitDiffTokenCount = deps.precomputedMetrics.gitDiffTokenCount;
    gitLogTokenCount = deps.precomputedMetrics.gitLogTokenCount;
  } else {
    // Fallback: compute metrics inline (e.g., when called from tests or MCP)
    const tokenCounter = deps.tokenCounter ?? (await TokenCounter.create(config.tokenCount.encoding));
    const allFilePaths = processedFiles.map((file) => file.path);

    selectiveFileMetrics = await deps.calculateSelectiveFileMetrics(
      processedFiles,
      allFilePaths,
      config.tokenCount.encoding,
      progressCallback,
      { tokenCounter },
    );

    gitDiffTokenCount = await deps.calculateGitDiffMetrics(config, gitDiffResult, { tokenCounter });
    const gitLogResult2 = await deps.calculateGitLogMetrics(config, gitLogResult, { tokenCounter });
    gitLogTokenCount = gitLogResult2.gitLogTokenCount;
  }

  const totalFiles = processedFiles.length;
  const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

  // Build character counts and token counts for all files
  const fileCharCounts: Record<string, number> = {};
  const fileTokenCounts: Record<string, number> = {};
  let sumFileChars = 0;
  let sumFileTokens = 0;

  for (const file of processedFiles) {
    fileCharCounts[file.path] = file.content.length;
    sumFileChars += file.content.length;
  }

  for (const file of selectiveFileMetrics) {
    fileTokenCounts[file.path] = file.tokenCount;
    sumFileTokens += file.tokenCount;
  }

  // Estimate total output tokens from individual file token counts.
  // The output contains all file contents plus format overhead (XML tags, headers, tree).
  // File tokens are exact; overhead tokens are estimated using the same char/token ratio.
  let totalTokens: number;
  if (sumFileTokens > 0 && sumFileChars > 0) {
    const overheadChars = totalCharacters - sumFileChars;
    const charsPerToken = sumFileChars / sumFileTokens;
    const overheadTokens = Math.round(overheadChars / charsPerToken);
    totalTokens = sumFileTokens + overheadTokens;

    const isTracing = logger.getLogLevel() >= repomixLogLevels.DEBUG;
    if (isTracing) {
      logger.trace(
        `Output token estimation: ${sumFileTokens} file tokens + ${overheadTokens} overhead tokens = ${totalTokens} total (${overheadChars} overhead chars, ${charsPerToken.toFixed(2)} chars/token)`,
      );
    }
  } else {
    // Fallback for empty output or zero-content files
    totalTokens = 0;
  }

  return {
    totalFiles,
    totalCharacters,
    totalTokens,
    fileCharCounts,
    fileTokenCounts,
    gitDiffTokenCount,
    gitLogTokenCount,
  };
};
