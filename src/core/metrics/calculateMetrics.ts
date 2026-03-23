import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
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
  calculateOutputMetrics,
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
  // For top files display optimization: calculate token counts only for top files by character count
  // However, if tokenCountTree is enabled, calculate for all files to avoid double calculation
  const topFilesLength = config.output.topFilesLength;
  const shouldCalculateAllFiles = !!config.output.tokenCountTree;

  const metricsTargetPaths = shouldCalculateAllFiles
    ? processedFiles.map((file) => file.path)
    : [...processedFiles]
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
        .map((file) => file.path);

  // All metrics are computed on the main thread — no worker overhead
  const selectiveFileMetrics = await deps.calculateSelectiveFileMetrics(
    processedFiles,
    metricsTargetPaths,
    config.tokenCount.encoding,
    progressCallback,
    { tokenCounter },
  );

  let totalTokens = 0;
  for (const part of outputParts) {
    const partPath =
      outputParts.length > 1
        ? buildSplitOutputFilePath(config.output.filePath, outputParts.indexOf(part) + 1)
        : config.output.filePath;
    totalTokens += await deps.calculateOutputMetrics(part, config.tokenCount.encoding, partPath, { tokenCounter });
  }

  const gitDiffTokenCount = await deps.calculateGitDiffMetrics(config, gitDiffResult, { tokenCounter });
  const gitLogTokenCountResult = await deps.calculateGitLogMetrics(config, gitLogResult, { tokenCounter });

  const totalFiles = processedFiles.length;
  const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

  // Build character counts for all files
  const fileCharCounts: Record<string, number> = {};
  for (const file of processedFiles) {
    fileCharCounts[file.path] = file.content.length;
  }

  // Build token counts only for top files
  const fileTokenCounts: Record<string, number> = {};
  for (const file of selectiveFileMetrics) {
    fileTokenCounts[file.path] = file.tokenCount;
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
