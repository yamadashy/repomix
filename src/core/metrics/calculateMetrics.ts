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

const defaultDeps = {
  calculateSelectiveFileMetrics,
  calculateOutputMetrics,
  calculateGitDiffMetrics,
  calculateGitLogMetrics,
};

/**
 * Determine which files to calculate token counts for.
 * Exported so packager.ts can start file metrics early in parallel with output generation.
 */
export const getMetricsTargetPaths = (processedFiles: ProcessedFile[], config: RepomixConfigMerged): string[] => {
  const shouldCalculateAllFiles = !!config.output.tokenCountTree;
  if (shouldCalculateAllFiles) {
    return processedFiles.map((file) => file.path);
  }
  const topFilesLength = config.output.topFilesLength;
  // slice() creates a shallow copy more efficiently than spread [...processedFiles]
  // by pre-allocating the correct array size instead of iterating the spread.
  return processedFiles
    .slice()
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
  precomputedFileMetrics?: FileMetrics[],
  overrideDeps: Partial<typeof defaultDeps> = {},
): Promise<CalculateMetricsResult> => {
  const deps = { ...defaultDeps, ...overrideDeps };

  progressCallback('Calculating metrics...');

  const outputParts = Array.isArray(output) ? output : [output];

  // Use pre-computed file metrics if available (from parallel execution with output generation),
  // otherwise compute them now
  const selectiveFileMetrics =
    precomputedFileMetrics ??
    (await deps.calculateSelectiveFileMetrics(
      processedFiles,
      getMetricsTargetPaths(processedFiles, config),
      config.tokenCount.encoding,
      progressCallback,
    ));

  const totalFiles = processedFiles.length;
  const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

  // Estimate total output tokens from the selective file metrics char:token ratio.
  // Counting tokens on the full output string (3-5MB) takes 400-800ms — the single
  // most expensive operation in the pipeline. Instead, derive the ratio from the
  // already-computed selective file metrics and apply it to the total output chars.
  // This gives ~95-99% accuracy while being effectively instant.
  const [estimatedOutputTokens, gitDiffTokenCount, gitLogTokenCount] = await Promise.all([
    (async () => {
      if (selectiveFileMetrics.length === 0) {
        // No file metrics available — fall back to counting the output directly
        const partPath =
          outputParts.length > 1 ? buildSplitOutputFilePath(config.output.filePath, 1) : config.output.filePath;
        return deps.calculateOutputMetrics(outputParts[0], config.tokenCount.encoding, partPath);
      }
      // Compute char:token ratio from selective file metrics
      let sampleChars = 0;
      let sampleTokens = 0;
      for (const fm of selectiveFileMetrics) {
        sampleChars += fm.charCount;
        sampleTokens += fm.tokenCount;
      }
      if (sampleTokens === 0 || sampleChars === 0) {
        return 0;
      }
      // Apply the ratio to total output character count
      return Math.round(totalCharacters * (sampleTokens / sampleChars));
    })(),
    deps.calculateGitDiffMetrics(config, gitDiffResult),
    deps.calculateGitLogMetrics(config, gitLogResult),
  ]);

  const totalTokens = estimatedOutputTokens;

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
