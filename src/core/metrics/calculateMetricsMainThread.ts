import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { CountTokensFn } from './calculateMetrics.js';
import { type CalculateMetricsResult, estimateOutputTokens, getGitDiffChars, getGitLogChars } from './metricsUtils.js';

/**
 * Main-thread tokenization path. Tokenizes the top files synchronously on the
 * main thread using a pre-loaded countTokens function. Avoids worker pool
 * creation, thread cold-start, message serialization, and JIT cold-start
 * overhead (~300-400ms combined on a typical run).
 */
export const calculateMetricsOnMainThread = async (
  processedFiles: ProcessedFile[],
  outputPromise: Promise<string | string[]>,
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult: GitDiffResult | undefined,
  gitLogResult: GitLogResult | undefined,
  countTokens: CountTokensFn,
): Promise<CalculateMetricsResult> => {
  progressCallback('Calculating metrics...');

  const startTime = process.hrtime.bigint();
  const topFilesLength = config.output.topFilesLength;
  const PLAIN_TEXT_OPTIONS = { disallowedSpecial: new Set<string>() };

  // Select top files for BPE tokenization (same logic as worker path)
  const sorted = [...processedFiles].sort((a, b) => b.content.length - a.content.length);
  const targetCount = Math.min(processedFiles.length, Math.max(topFilesLength * 10, topFilesLength));
  const targetFiles = sorted.slice(0, targetCount);

  // Tokenize target files on main thread
  const fileTokenCounts: Record<string, number> = {};
  for (const file of targetFiles) {
    try {
      fileTokenCounts[file.path] = countTokens(file.content, PLAIN_TEXT_OPTIONS);
    } catch {
      logger.warn(`Failed to count tokens for ${file.path}`);
      fileTokenCounts[file.path] = 0;
    }
  }

  // Tokenize git diff/log content on main thread
  let gitDiffTokenCount = 0;
  if (config.output.git?.includeDiffs && gitDiffResult) {
    try {
      if (gitDiffResult.workTreeDiffContent) {
        gitDiffTokenCount += countTokens(gitDiffResult.workTreeDiffContent, PLAIN_TEXT_OPTIONS);
      }
      if (gitDiffResult.stagedDiffContent) {
        gitDiffTokenCount += countTokens(gitDiffResult.stagedDiffContent, PLAIN_TEXT_OPTIONS);
      }
    } catch (error) {
      logger.error('Error during git diff token calculation:', error);
    }
  }

  let gitLogTokenCount = 0;
  if (config.output.git?.includeLogs && gitLogResult?.logContent) {
    try {
      gitLogTokenCount = countTokens(gitLogResult.logContent, PLAIN_TEXT_OPTIONS);
    } catch (error) {
      logger.error('Error during git log token calculation:', error);
    }
  }

  const endTime = process.hrtime.bigint();
  logger.trace(`Main-thread metrics tokenization completed in ${(Number(endTime - startTime) / 1e6).toFixed(2)}ms`);

  // Wait for output to compute total characters and final estimate
  const resolvedOutput = await outputPromise;
  const outputParts = Array.isArray(resolvedOutput) ? resolvedOutput : [resolvedOutput];
  const totalCharacters = outputParts.reduce((sum, part) => sum + part.length, 0);

  // Build character counts for all files
  const fileCharCounts: Record<string, number> = {};
  for (const file of processedFiles) {
    fileCharCounts[file.path] = file.content.length;
  }

  const totalTokens = estimateOutputTokens(
    processedFiles,
    fileTokenCounts,
    totalCharacters,
    gitDiffTokenCount,
    gitLogTokenCount,
    getGitDiffChars(gitDiffResult),
    getGitLogChars(gitLogResult),
  );

  return {
    totalFiles: processedFiles.length,
    totalCharacters,
    totalTokens,
    fileCharCounts,
    fileTokenCounts,
    gitDiffTokenCount,
    gitLogTokenCount,
  };
};
