import { describe, expect, test } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile, TruncationMetrics } from '../../../src/core/file/fileTypes.js';
import {
  calculateTruncationMetrics,
  formatTruncationProgress,
  getTruncationStats,
  getTruncationSummary,
} from '../../../src/core/file/truncationMetrics.js';

describe('TruncationMetrics', () => {
  const createMockProcessedFile = (
    path: string,
    content: string,
    truncated: boolean = false,
    lineLimit?: number,
  ): ProcessedFile => {
    const lineCount = content.split('\n').length;
    return {
      path,
      content,
      truncation: truncated
        ? {
            truncated: true,
            originalLineCount: lineCount,
            truncatedLineCount: lineLimit || Math.min(lineCount, 50),
            lineLimit: lineLimit || 50,
          }
        : {
            truncated: false,
            originalLineCount: lineCount,
            truncatedLineCount: lineCount,
            lineLimit: lineLimit || 50,
          },
    };
  };

  const createMockConfig = (lineLimit: number = 50): RepomixConfigMerged => ({
    cwd: '/test',
    input: { maxFileSize: 1024 * 1024 },
    output: {
      filePath: 'test.xml',
      style: 'xml',
      parsableStyle: false,
      fileSummary: true,
      directoryStructure: true,
      files: true,
      removeComments: false,
      removeEmptyLines: false,
      compress: false,
      topFilesLength: 5,
      showLineNumbers: false,
      truncateBase64: false,
      lineLimit,
      copyToClipboard: false,
      includeEmptyDirectories: false,
      includeFullDirectoryStructure: false,
      tokenCountTree: false,
      git: {
        sortByChanges: true,
        sortByChangesMaxCommits: 100,
        includeDiffs: false,
        includeLogs: false,
        includeLogsCount: 50,
      },
    },
    include: [],
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
      customPatterns: [],
    },
    security: {
      enableSecurityCheck: true,
    },
    tokenCount: {
      encoding: 'o200k_base',
    },
  });

  describe('calculateTruncationMetrics', () => {
    test('should calculate metrics correctly when no files are truncated', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\nline2'),
      ];
      const config = createMockConfig(50);

      const metrics = calculateTruncationMetrics(processedFiles, config, false);

      expect(metrics.totalFilesProcessed).toBe(2);
      expect(metrics.truncatedFilesCount).toBe(0);
      expect(metrics.totalOriginalLines).toBe(5);
      expect(metrics.totalTruncatedLines).toBe(5);
      expect(metrics.lineLimitUsed).toBe(50);
      expect(metrics.perFileTruncation).toBeUndefined();
    });

    test('should calculate metrics correctly when some files are truncated', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\n'.repeat(100), true, 50), // 101 lines, will be truncated
      ];
      const config = createMockConfig(50);

      const metrics = calculateTruncationMetrics(processedFiles, config, false);

      expect(metrics.totalFilesProcessed).toBe(2);
      expect(metrics.truncatedFilesCount).toBe(1);
      expect(metrics.totalOriginalLines).toBe(104); // 3 + 101
      expect(metrics.totalTruncatedLines).toBe(53); // 3 + 50
      expect(metrics.lineLimitUsed).toBe(50);
      expect(metrics.perFileTruncation).toBeUndefined();
    });

    test('should include per-file details when verbose is enabled', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\n'.repeat(100), true, 50),
      ];
      const config = createMockConfig(50);

      const metrics = calculateTruncationMetrics(processedFiles, config, true);

      expect(metrics.perFileTruncation).toBeDefined();
      expect(metrics.perFileTruncation).toHaveLength(2);
      expect(metrics.perFileTruncation![0]).toEqual({
        filePath: 'file1.js',
        originalLines: 3,
        truncatedLines: 3,
        truncated: false,
        lineLimit: 50,
      });
      expect(metrics.perFileTruncation![1]).toEqual({
        filePath: 'file2.js',
        originalLines: 101,
        truncatedLines: 50,
        truncated: true,
        lineLimit: 50,
      });
    });

    test('should handle files without truncation info', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        { path: 'file2.js', content: 'line1\nline2', truncation: undefined } as ProcessedFile,
      ];
      const config = createMockConfig(50);

      const metrics = calculateTruncationMetrics(processedFiles, config, true);

      expect(metrics.totalFilesProcessed).toBe(2);
      expect(metrics.truncatedFilesCount).toBe(0);
      expect(metrics.totalOriginalLines).toBe(5); // 3 + 2
      expect(metrics.totalTruncatedLines).toBe(5);
      expect(metrics.perFileTruncation![1]).toEqual({
        filePath: 'file2.js',
        originalLines: 2,
        truncatedLines: 2,
        truncated: false,
        lineLimit: 50,
      });
    });

    test('should calculate token metrics when token counts are provided', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\n'.repeat(100), true, 50),
      ];
      const config = createMockConfig(50);
      const fileTokenCounts = {
        'file1.js': 15,
        'file2.js': 200, // Truncated token count
      };
      const fileOriginalTokenCounts = {
        'file1.js': 15,
        'file2.js': 400, // Original token count
      };

      const metrics = calculateTruncationMetrics(
        processedFiles,
        config,
        false,
        fileTokenCounts,
        fileOriginalTokenCounts,
      );

      expect(metrics.totalOriginalTokens).toBe(415); // 15 + 400
      expect(metrics.totalTruncatedTokens).toBe(215); // 15 + 200
      expect(metrics.tokenReductionPercentage).toBe(48); // Math.round((415-215)/415 * 100)
    });

    test('should handle missing token counts gracefully', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\n'.repeat(100), true, 50),
      ];
      const config = createMockConfig(50);
      const fileTokenCounts = { 'file1.js': 15 }; // Missing file2.js
      const fileOriginalTokenCounts = { 'file2.js': 400 }; // Missing file1.js

      const metrics = calculateTruncationMetrics(
        processedFiles,
        config,
        false,
        fileTokenCounts,
        fileOriginalTokenCounts,
      );

      expect(metrics.totalOriginalTokens).toBe(400); // Only file2.js
      expect(metrics.totalTruncatedTokens).toBe(15); // Only file1.js
      expect(metrics.tokenReductionPercentage).toBe(0); // No reduction calculation possible
    });

    test('should handle zero token reduction percentage', () => {
      const processedFiles = [createMockProcessedFile('file1.js', 'line1\nline2\nline3')];
      const config = createMockConfig(50);
      const fileTokenCounts = { 'file1.js': 15 };
      const fileOriginalTokenCounts = { 'file1.js': 15 };

      const metrics = calculateTruncationMetrics(
        processedFiles,
        config,
        false,
        fileTokenCounts,
        fileOriginalTokenCounts,
      );

      expect(metrics.totalOriginalTokens).toBe(15);
      expect(metrics.totalTruncatedTokens).toBe(15);
      expect(metrics.tokenReductionPercentage).toBe(0);
    });

    test('should handle empty file list', () => {
      const processedFiles: ProcessedFile[] = [];
      const config = createMockConfig(50);

      const metrics = calculateTruncationMetrics(processedFiles, config, false);

      expect(metrics.totalFilesProcessed).toBe(0);
      expect(metrics.truncatedFilesCount).toBe(0);
      expect(metrics.totalOriginalLines).toBe(0);
      expect(metrics.totalTruncatedLines).toBe(0);
      expect(metrics.lineLimitUsed).toBe(50);
      expect(metrics.perFileTruncation).toBeUndefined();
    });

    test('should handle config without line limit', () => {
      const processedFiles = [createMockProcessedFile('file1.js', 'line1\nline2\nline3')];
      const config = createMockConfig(0); // No line limit

      const metrics = calculateTruncationMetrics(processedFiles, config, false);

      expect(metrics.lineLimitUsed).toBe(0);
    });
  });

  describe('formatTruncationProgress', () => {
    test('should format progress message correctly', () => {
      const message = formatTruncationProgress(50, 100, 5);

      expect(message).toContain('Processing files...');
      expect(message).toContain('50%');
      expect(message).toContain('(50/100 files');
      expect(message).toContain('5 truncated');
    });

    test('should show progress bar', () => {
      const message = formatTruncationProgress(25, 100, 2);

      expect(message).toContain('█████'); // 25% progress bar (5 out of 20 characters)
    });

    test('should not show truncated count when zero', () => {
      const message = formatTruncationProgress(75, 100, 0);

      expect(message).toContain('(75/100 files)');
      expect(message).not.toContain('truncated');
    });

    test('should handle 0% progress', () => {
      const message = formatTruncationProgress(0, 100, 0);

      expect(message).toContain('0%');
      expect(message).toContain('(0/100 files)');
      expect(message).toContain('░'.repeat(20)); // Empty progress bar
    });

    test('should handle 100% progress', () => {
      const message = formatTruncationProgress(100, 100, 10);

      expect(message).toContain('100%');
      expect(message).toContain('(100/100 files');
      expect(message).toContain('10 truncated');
      expect(message).toContain('█'.repeat(20)); // Full progress bar
    });

    test('should handle single file', () => {
      const message = formatTruncationProgress(1, 1, 0);

      expect(message).toContain('100%');
      expect(message).toContain('(1/1 files)');
      expect(message).not.toContain('truncated');
    });

    test('should handle large numbers', () => {
      const message = formatTruncationProgress(1234, 5000, 567);

      expect(message).toContain('25%'); // Math.round(1234/5000 * 100)
      expect(message).toContain('(1234/5000 files');
      expect(message).toContain('567 truncated');
    });
  });

  describe('getTruncationSummary', () => {
    test('should return correct summary when line limit is applied', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 10,
        truncatedFilesCount: 3,
        totalOriginalLines: 500,
        totalTruncatedLines: 300,
        lineLimitUsed: 50,
      };

      const summary = getTruncationSummary(metrics);

      expect(summary).toBe('10 files (3 truncated, 7 unchanged)');
    });

    test('should return correct summary when no files are truncated', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 5,
        truncatedFilesCount: 0,
        totalOriginalLines: 100,
        totalTruncatedLines: 100,
        lineLimitUsed: 50,
      };

      const summary = getTruncationSummary(metrics);

      expect(summary).toBe('5 files (0 truncated, 5 unchanged)');
    });

    test('should return correct summary when all files are truncated', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 8,
        truncatedFilesCount: 8,
        totalOriginalLines: 800,
        totalTruncatedLines: 400,
        lineLimitUsed: 50,
      };

      const summary = getTruncationSummary(metrics);

      expect(summary).toBe('8 files (8 truncated, 0 unchanged)');
    });

    test('should return no limit message when no line limit is applied', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 5,
        truncatedFilesCount: 0,
        totalOriginalLines: 100,
        totalTruncatedLines: 100,
        lineLimitUsed: null,
      };

      const summary = getTruncationSummary(metrics);

      expect(summary).toBe('No line limit applied');
    });

    test('should handle zero original lines', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 1,
        truncatedFilesCount: 0,
        totalOriginalLines: 0,
        totalTruncatedLines: 0,
        lineLimitUsed: 50,
      };

      const summary = getTruncationSummary(metrics);

      expect(summary).toBe('1 files (0 truncated, 1 unchanged)');
    });
  });

  describe('getTruncationStats', () => {
    test('should return correct stats when line limit is applied', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 10,
        truncatedFilesCount: 3,
        totalOriginalLines: 500,
        totalTruncatedLines: 300,
        lineLimitUsed: 50,
        totalOriginalTokens: 1000,
        totalTruncatedTokens: 600,
        tokenReductionPercentage: 40,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.summary).toBe('Processed 10 files (3 truncated, 7 unchanged)');
      expect(stats.reductionInfo).toBe('Total lines reduced: 500 → 300 (40% reduction)');
      expect(stats.lineLimitInfo).toBe('Applied line limit: 50 lines per file');
      expect(stats.tokenInfo).toBe('Token reduction: 1,000 → 600 (40% reduction)');
    });

    test('should return correct stats when no line limit is applied', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 5,
        truncatedFilesCount: 0,
        totalOriginalLines: 100,
        totalTruncatedLines: 100,
        lineLimitUsed: null,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.summary).toBe('No line limit applied');
      expect(stats.reductionInfo).toBe('');
      expect(stats.lineLimitInfo).toBe('');
      expect(stats.tokenInfo).toBe('');
    });

    test('should calculate reduction percentage correctly', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 2,
        truncatedFilesCount: 1,
        totalOriginalLines: 100,
        totalTruncatedLines: 50,
        lineLimitUsed: 50,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.reductionInfo).toBe('Total lines reduced: 100 → 50 (50% reduction)');
    });

    test('should handle zero original lines', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 1,
        truncatedFilesCount: 0,
        totalOriginalLines: 0,
        totalTruncatedLines: 0,
        lineLimitUsed: 50,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.reductionInfo).toBe('Total lines reduced: 0 → 0 (0% reduction)');
    });

    test('should handle missing token information', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 5,
        truncatedFilesCount: 2,
        totalOriginalLines: 200,
        totalTruncatedLines: 100,
        lineLimitUsed: 50,
        // Token info missing
      };

      const stats = getTruncationStats(metrics);

      expect(stats.summary).toBe('Processed 5 files (2 truncated, 3 unchanged)');
      expect(stats.reductionInfo).toBe('Total lines reduced: 200 → 100 (50% reduction)');
      expect(stats.lineLimitInfo).toBe('Applied line limit: 50 lines per file');
      expect(stats.tokenInfo).toBe('');
    });

    test('should handle zero token reduction', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 3,
        truncatedFilesCount: 0,
        totalOriginalLines: 150,
        totalTruncatedLines: 150,
        lineLimitUsed: 50,
        totalOriginalTokens: 300,
        totalTruncatedTokens: 300,
        tokenReductionPercentage: 0,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.tokenInfo).toBe('Token reduction: 300 → 300 (0% reduction)');
    });

    test('should format large numbers with locale', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 1000,
        truncatedFilesCount: 500,
        totalOriginalLines: 1000000,
        totalTruncatedLines: 500000,
        lineLimitUsed: 50,
        totalOriginalTokens: 2000000,
        totalTruncatedTokens: 1000000,
        tokenReductionPercentage: 50,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.summary).toBe('Processed 1,000 files (500 truncated, 500 unchanged)');
      expect(stats.reductionInfo).toBe('Total lines reduced: 1,000,000 → 500,000 (50% reduction)');
      expect(stats.lineLimitInfo).toBe('Applied line limit: 50 lines per file');
      expect(stats.tokenInfo).toBe('Token reduction: 2,000,000 → 1,000,000 (50% reduction)');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed truncation info', () => {
      const processedFiles = [
        {
          path: 'file1.js',
          content: 'line1\nline2',
          truncation: {
            truncated: true,
            originalLineCount: -1, // Invalid
            truncatedLineCount: 5,
            lineLimit: 10,
          },
        } as ProcessedFile,
      ];
      const config = createMockConfig(10);

      // Should not throw but handle gracefully
      expect(() => {
        calculateTruncationMetrics(processedFiles, config, false);
      }).not.toThrow();
    });

    test('should handle very large line counts', () => {
      const largeContent = 'line\n'.repeat(1000000); // 1M lines
      const processedFiles = [createMockProcessedFile('large.js', largeContent, true, 1000)];
      const config = createMockConfig(1000);

      const metrics = calculateTruncationMetrics(processedFiles, config, false);

      expect(metrics.totalOriginalLines).toBe(1000000);
      expect(metrics.totalTruncatedLines).toBe(1000);
      expect(metrics.truncatedFilesCount).toBe(1);
    });

    test('should handle negative progress values', () => {
      expect(() => {
        formatTruncationProgress(-1, 100, 0);
      }).not.toThrow();

      expect(() => {
        formatTruncationProgress(50, -100, 0);
      }).not.toThrow();

      expect(() => {
        formatTruncationProgress(50, 100, -5);
      }).not.toThrow();
    });

    test('should handle progress with total zero', () => {
      const message = formatTruncationProgress(0, 0, 0);

      expect(message).toContain('Processing files...');
      expect(message).toContain('0%');
      expect(message).toContain('(0/0 files)');
    });

    test('should handle progress exceeding 100%', () => {
      const message = formatTruncationProgress(150, 100, 10);

      expect(message).toContain('150%'); // Should handle gracefully
      expect(message).toContain('(150/100 files)');
    });
  });
});
