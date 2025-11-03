import { describe, expect, it } from 'vitest';
import type { RepomixConfigMerged } from '../../src/config/configSchema.js';
import type { ProcessedFile, TruncationMetrics } from '../../src/core/file/fileTypes.js';
import {
  calculateTruncationMetrics,
  formatTruncationProgress,
  getTruncationStats,
} from '../../src/core/file/truncationMetrics.js';

describe('Truncation Progress Reporting', () => {
  const createMockProcessedFile = (path: string, content: string, truncated: boolean = false): ProcessedFile => {
    const lineCount = content.split('\n').length;
    return {
      path,
      content,
      truncation: truncated
        ? {
            truncated: true,
            originalLineCount: lineCount,
            truncatedLineCount: Math.min(lineCount, 50),
            lineLimit: 50,
          }
        : {
            truncated: false,
            originalLineCount: lineCount,
            truncatedLineCount: lineCount,
            lineLimit: 50,
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
    it('should calculate metrics correctly when no files are truncated', () => {
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

    it('should calculate metrics correctly when some files are truncated', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\n'.repeat(100), true), // 101 lines, will be truncated
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

    it('should include per-file details when verbose is enabled', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        createMockProcessedFile('file2.js', 'line1\n'.repeat(100), true),
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

    it('should handle files without truncation info', () => {
      const processedFiles = [
        createMockProcessedFile('file1.js', 'line1\nline2\nline3'),
        { path: 'file2.js', content: 'line1\nline2', truncation: undefined },
      ] as ProcessedFile[];
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
  });

  describe('formatTruncationProgress', () => {
    it('should format progress message correctly', () => {
      const message = formatTruncationProgress(50, 100, 5);

      expect(message).toContain('Processing files...');
      expect(message).toContain('50%');
      expect(message).toContain('(50/100 files');
      expect(message).toContain('5 truncated');
    });

    it('should show progress bar', () => {
      const message = formatTruncationProgress(25, 100, 2);

      expect(message).toContain('█████'); // 25% progress bar (5 out of 20 characters)
    });

    it('should not show truncated count when zero', () => {
      const message = formatTruncationProgress(75, 100, 0);

      expect(message).toContain('(75/100 files)');
      expect(message).not.toContain('truncated');
    });
  });

  describe('getTruncationStats', () => {
    it('should return correct stats when line limit is applied', () => {
      const metrics: TruncationMetrics = {
        totalFilesProcessed: 10,
        truncatedFilesCount: 3,
        totalOriginalLines: 500,
        totalTruncatedLines: 300,
        lineLimitUsed: 50,
      };

      const stats = getTruncationStats(metrics);

      expect(stats.summary).toBe('Processed 10 files (3 truncated, 7 unchanged)');
      expect(stats.reductionInfo).toBe('Total lines reduced: 500 → 300 (40% reduction)');
      expect(stats.lineLimitInfo).toBe('Applied line limit: 50 lines per file');
    });

    it('should return correct stats when no line limit is applied', () => {
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
    });

    it('should calculate reduction percentage correctly', () => {
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

    it('should handle zero original lines', () => {
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
  });
});
