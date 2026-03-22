import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { buildSplitOutputFilePath } from '../output/outputSplit.js';
import { calculateGitDiffMetrics } from './calculateGitDiffMetrics.js';
import { calculateGitLogMetrics } from './calculateGitLogMetrics.js';
import { calculateOutputMetrics } from './calculateOutputMetrics.js';
import type { SelectiveMetricsResult } from './calculateSelectiveFileMetrics.js';
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

/**
 * Determine which files need token counting based on config.
 * Exported so the packager can start file metrics early (in parallel with output generation).
 */
export const getMetricsTargetPaths = (processedFiles: ProcessedFile[], config: RepomixConfigMerged): string[] => {
  const topFilesLength = config.output.topFilesLength;
  const shouldCalculateAllFiles = !!config.output.tokenCountTree;

  return shouldCalculateAllFiles
    ? processedFiles.map((file) => file.path)
    : [...processedFiles]
        .sort((a, b) => b.content.length - a.content.length)
        .slice(0, Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength)))
        .map((file) => file.path);
};

export const calculateMetrics = async (
  processedFiles: ProcessedFile[],
  output: string | string[],
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  options?: {
    precomputedFileMetrics?: SelectiveMetricsResult | Promise<SelectiveMetricsResult>;
    precomputedOutputTokens?: number | Promise<number>;
  },
  deps = {
    calculateSelectiveFileMetrics,
    calculateOutputMetrics,
    calculateGitDiffMetrics,
    calculateGitLogMetrics,
  },
): Promise<CalculateMetricsResult> => {
  progressCallback('Calculating metrics...');

  const outputParts = Array.isArray(output) ? output : [output];

  // Use precomputed file metrics if available (when file metrics ran in parallel with output generation),
  // otherwise calculate them now
  const metricsResult = options?.precomputedFileMetrics
    ? await Promise.resolve(options.precomputedFileMetrics)
    : await deps.calculateSelectiveFileMetrics(
        processedFiles,
        getMetricsTargetPaths(processedFiles, config),
        config.tokenCount.encoding,
        progressCallback,
      );

  // Count output tokens, git diff tokens, and git log tokens in parallel
  // since they are independent of each other.
  // Use precomputed output tokens if available (from speculative counting during security check).
  const outputTokensPromise =
    options?.precomputedOutputTokens !== undefined
      ? Promise.resolve(options.precomputedOutputTokens)
      : Promise.all(
          outputParts.map((part, index) => {
            const partPath =
              outputParts.length > 1
                ? buildSplitOutputFilePath(config.output.filePath, index + 1)
                : config.output.filePath;
            return deps.calculateOutputMetrics(part, config.tokenCount.encoding, partPath);
          }),
        ).then((counts) => counts.reduce((sum, count) => sum + count, 0));

  const [totalTokens, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
    outputTokensPromise,
    deps.calculateGitDiffMetrics(config, gitDiffResult),
    deps.calculateGitLogMetrics(config, gitLogResult),
  ]);
  const totalFiles = processedFiles.length;
  const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

  // Build character counts for all files
  const fileCharCounts: Record<string, number> = {};
  for (const file of processedFiles) {
    fileCharCounts[file.path] = file.content.length;
  }

  // Build token counts only for top files, filtering to files in processedFiles
  // (precomputed metrics may include suspicious files that were later excluded)
  const fileTokenCounts: Record<string, number> = {};
  for (const file of metricsResult.fileMetrics) {
    if (file.path in fileCharCounts) {
      fileTokenCounts[file.path] = file.tokenCount;
    }
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
