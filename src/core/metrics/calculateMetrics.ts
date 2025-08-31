import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import { calculateSelectiveFileMetrics } from './calculateSelectiveFileMetrics.js';

export interface CalculateMetricsResult {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  gitDiffTokenCount: number;
  gitLogTokenCount: number;
}

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  output: string,
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  deps = {
    calculateSelectiveFileMetrics,
    calculateOutputMetrics,
    calculateGitDiffMetrics,
    calculateGitLogMetrics,
  },
): Promise<CalculateMetricsResult> => {
  progressCallback('Calculating metrics...');

  // For top files display optimization: calculate token counts only for top files by character count
  // However, if tokenCountTree is enabled, calculate for all files to avoid double calculation
  const topFilesLength = config.output.topFilesLength;
  const shouldCalculateAllFiles = !!config.output.tokenCountTree;

  // Determine which files to calculate token counts for:
  // - If tokenCountTree is enabled: calculate for all files to avoid double calculation
  // - Otherwise: calculate only for top files by character count for optimization
  const metricsTargetPaths = shouldCalculateAllFiles
    ? processedFiles.map((file) => file.path)
    : [...processedFiles]
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
        .map((file) => file.path);

  const [selectiveFileMetrics, totalTokens, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
    deps.calculateSelectiveFileMetrics(
      processedFiles,
      metricsTargetPaths,
      config.tokenCount.encoding,
      progressCallback,
      config.worker,
    ),
    deps.calculateOutputMetrics(output, config.tokenCount.encoding, config.output.filePath, config.worker),
    deps.calculateGitDiffMetrics(config, gitDiffResult),
    deps.calculateGitLogMetrics(config, gitLogResult),
  ]);

  const totalFiles = processedFiles.length;
  const totalCharacters = output.length;

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
    gitLogTokenCount: gitLogTokenCount.gitLogTokenCount,
  };
};
