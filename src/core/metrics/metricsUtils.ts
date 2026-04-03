import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';

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
 * Estimate total output tokens from per-file token counts and a chars-to-tokens ratio.
 *
 * The output is ~93% file content. For files that have been individually tokenized,
 * their exact counts are used. For uncounted files and template overhead, the
 * chars-to-tokens ratio derived from the counted files is applied.
 * This avoids re-tokenizing the entire output (~4MB), which would otherwise
 * require waiting for output generation to complete before tokenization can start.
 */
export const estimateOutputTokens = (
  processedFiles: ProcessedFile[],
  fileTokenCounts: Record<string, number>,
  totalOutputChars: number,
  gitDiffTokenCount: number,
  gitLogTokenCount: number,
  gitDiffChars: number,
  gitLogChars: number,
): number => {
  let countedFileTokens = 0;
  let countedFileChars = 0;
  let uncountedFileChars = 0;

  for (const file of processedFiles) {
    const tokens = fileTokenCounts[file.path];
    if (tokens !== undefined) {
      countedFileTokens += tokens;
      countedFileChars += file.content.length;
    } else {
      uncountedFileChars += file.content.length;
    }
  }

  // Derive chars-per-token ratio from the counted files.
  // Typical ratio: ~3.5-4.5 chars/token for mixed code+text.
  // Fallback to 4.0 if no counted file data is available.
  const rawRatio = countedFileTokens > 0 ? countedFileChars / countedFileTokens : 0;
  const charsPerToken = rawRatio > 0 ? rawRatio : 4.0;

  // Estimate tokens for uncounted files using the derived ratio
  const uncountedFileTokens = uncountedFileChars > 0 ? Math.round(uncountedFileChars / charsPerToken) : 0;

  // Overhead = output chars minus all file content and git content
  const totalFileChars = countedFileChars + uncountedFileChars;
  const overheadChars = totalOutputChars - totalFileChars - gitDiffChars - gitLogChars;
  const overheadTokens = overheadChars > 0 ? Math.round(overheadChars / charsPerToken) : 0;

  return countedFileTokens + uncountedFileTokens + gitDiffTokenCount + gitLogTokenCount + overheadTokens;
};

/**
 * Get the total character count of git diff content.
 */
export const getGitDiffChars = (gitDiffResult: GitDiffResult | undefined): number => {
  if (!gitDiffResult) return 0;
  return (gitDiffResult.workTreeDiffContent?.length ?? 0) + (gitDiffResult.stagedDiffContent?.length ?? 0);
};

/**
 * Get the total character count of git log content.
 */
export const getGitLogChars = (gitLogResult: GitLogResult | undefined): number => {
  if (!gitLogResult) return 0;
  return gitLogResult.logContent?.length ?? 0;
};
