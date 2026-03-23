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

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

const defaultMetricsDeps = {
  calculateSelectiveFileMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
  tokenCounter: undefined as TokenCounter | undefined,
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

  // Use provided TokenCounter or create one on the main thread.
  // gpt-tokenizer is pure JS — counting on the main thread is ~2x faster
  // than worker threads due to eliminated structured clone serialization overhead.
  const tokenCounter = deps.tokenCounter ?? (await TokenCounter.create(config.tokenCount.encoding));

  const outputParts = Array.isArray(output) ? output : [output];

  // Count tokens for ALL files individually and estimate total output tokens from
  // the file token ratio. This eliminates the expensive full-output tokenization
  // (~540ms for a 3.6MB output) while providing per-file token counts for all files.
  //
  // The estimation uses: totalTokens = sum(fileTokens) + overheadTokens
  // where overheadTokens = overheadChars * (sum(fileTokens) / sum(fileChars))
  //
  // This is highly accurate (<0.1% error) because the format overhead (XML tags,
  // headers, tree structure) tokenizes at a similar ratio to source code content.
  const allFilePaths = processedFiles.map((file) => file.path);

  const selectiveFileMetrics = await deps.calculateSelectiveFileMetrics(
    processedFiles,
    allFilePaths,
    config.tokenCount.encoding,
    progressCallback,
    { tokenCounter },
  );

  const gitDiffTokenCount = await deps.calculateGitDiffMetrics(config, gitDiffResult, { tokenCounter });
  const gitLogTokenCountResult = await deps.calculateGitLogMetrics(config, gitLogResult, { tokenCounter });

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
    gitDiffTokenCount: gitDiffTokenCount,
    gitLogTokenCount: gitLogTokenCountResult.gitLogTokenCount,
  };
};
