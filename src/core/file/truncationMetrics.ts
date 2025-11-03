import type { RepomixConfigMerged } from '../../config/configSchema.js';
import type { PerFileTruncation, ProcessedFile, TruncationMetrics } from './fileTypes.js';

/**
 * Calculate truncation metrics from processed files
 */
export const calculateTruncationMetrics = (
  processedFiles: ProcessedFile[],
  config: RepomixConfigMerged,
  includePerFileDetails: boolean = false,
  fileTokenCounts: Record<string, number> = {},
  fileOriginalTokenCounts: Record<string, number> = {},
): TruncationMetrics => {
  let totalOriginalLines = 0;
  let totalTruncatedLines = 0;
  let truncatedFilesCount = 0;
  let totalOriginalTokens = 0;
  let totalTruncatedTokens = 0;
  const perFileTruncation: PerFileTruncation[] = [];

  for (const file of processedFiles) {
    if (file.truncation) {
      totalOriginalLines += file.truncation.originalLineCount;
      totalTruncatedLines += file.truncation.truncatedLineCount;

      // Add token counts if available
      const originalTokenCount = fileOriginalTokenCounts[file.path];
      const truncatedTokenCount = fileTokenCounts[file.path];

      if (originalTokenCount !== undefined) {
        totalOriginalTokens += originalTokenCount;
      }
      if (truncatedTokenCount !== undefined) {
        totalTruncatedTokens += truncatedTokenCount;
      }

      if (file.truncation.truncated) {
        truncatedFilesCount++;
      }

      if (includePerFileDetails) {
        perFileTruncation.push({
          filePath: file.path,
          originalLines: file.truncation.originalLineCount,
          truncatedLines: file.truncation.truncatedLineCount,
          truncated: file.truncation.truncated,
          lineLimit: file.truncation.lineLimit,
        });
      }
    } else {
      // Files without truncation info are counted as having their original line count
      const lineCount = file.content.split('\n').length;
      totalOriginalLines += lineCount;
      totalTruncatedLines += lineCount;

      // Add token counts if available
      const tokenCount = fileTokenCounts[file.path];
      if (tokenCount !== undefined) {
        totalOriginalTokens += tokenCount;
        totalTruncatedTokens += tokenCount;
      }

      if (includePerFileDetails) {
        perFileTruncation.push({
          filePath: file.path,
          originalLines: lineCount,
          truncatedLines: lineCount,
          truncated: false,
          lineLimit: config.output.lineLimit || 0,
        });
      }
    }
  }

  const tokenReductionPercentage =
    totalOriginalTokens > 0
      ? Math.round(((totalOriginalTokens - totalTruncatedTokens) / totalOriginalTokens) * 100)
      : 0;

  return {
    totalFilesProcessed: processedFiles.length,
    truncatedFilesCount,
    totalOriginalLines,
    totalTruncatedLines,
    lineLimitUsed: config.output.lineLimit || null,
    perFileTruncation: includePerFileDetails ? perFileTruncation : undefined,
    totalOriginalTokens,
    totalTruncatedTokens,
    tokenReductionPercentage,
  };
};

/**
 * Format truncation progress message for spinner
 */
export const formatTruncationProgress = (
  processedCount: number,
  totalCount: number,
  truncatedCount: number,
): string => {
  const percentage = Math.round((processedCount / totalCount) * 100);
  const truncatedText = truncatedCount > 0 ? `, ${truncatedCount} truncated` : '';
  return `Processing files... [${'█'.repeat(Math.floor(percentage / 5))}${'░'.repeat(20 - Math.floor(percentage / 5))}] ${percentage}% (${processedCount}/${totalCount} files${truncatedText})`;
};

/**
 * Get truncation summary text
 */
export const getTruncationSummary = (metrics: TruncationMetrics): string => {
  if (!metrics.lineLimitUsed) {
    return 'No line limit applied';
  }

  const unchangedCount = metrics.totalFilesProcessed - metrics.truncatedFilesCount;
  const reductionPercentage =
    metrics.totalOriginalLines > 0
      ? Math.round(((metrics.totalOriginalLines - metrics.totalTruncatedLines) / metrics.totalOriginalLines) * 100)
      : 0;

  return `${metrics.totalFilesProcessed} files (${metrics.truncatedFilesCount} truncated, ${unchangedCount} unchanged)`;
};

/**
 * Get detailed truncation statistics
 */
export const getTruncationStats = (
  metrics: TruncationMetrics,
): {
  summary: string;
  reductionInfo: string;
  lineLimitInfo: string;
  tokenInfo: string;
} => {
  if (!metrics.lineLimitUsed) {
    return {
      summary: 'No line limit applied',
      reductionInfo: '',
      lineLimitInfo: '',
      tokenInfo: '',
    };
  }

  const lineReductionPercentage =
    metrics.totalOriginalLines > 0
      ? Math.round(((metrics.totalOriginalLines - metrics.totalTruncatedLines) / metrics.totalOriginalLines) * 100)
      : 0;

  let tokenInfo = '';
  if (metrics.totalOriginalTokens !== undefined && metrics.totalTruncatedTokens !== undefined) {
    const tokenReductionPercentage = metrics.tokenReductionPercentage || 0;
    tokenInfo = `Token reduction: ${metrics.totalOriginalTokens.toLocaleString()} → ${metrics.totalTruncatedTokens.toLocaleString()} (${tokenReductionPercentage}% reduction)`;
  }

  return {
    summary: `Processed ${metrics.totalFilesProcessed} files (${metrics.truncatedFilesCount} truncated, ${metrics.totalFilesProcessed - metrics.truncatedFilesCount} unchanged)`,
    reductionInfo: `Total lines reduced: ${metrics.totalOriginalLines.toLocaleString()} → ${metrics.totalTruncatedLines.toLocaleString()} (${lineReductionPercentage}% reduction)`,
    lineLimitInfo: `Applied line limit: ${metrics.lineLimitUsed} lines per file`,
    tokenInfo,
  };
};
