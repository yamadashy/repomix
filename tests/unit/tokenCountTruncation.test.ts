import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../src/core/file/fileTypes.js';
import { calculateTruncationMetrics } from '../../src/core/file/truncationMetrics.js';
import { TokenCounter } from '../../src/core/metrics/TokenCounter.js';

describe('Token Count with Truncation', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    tokenCounter = new TokenCounter('o200k_base');
  });

  afterEach(() => {
    tokenCounter.free();
  });

  test('should count tokens for both original and truncated content', () => {
    const originalContent = 'This is the original content with multiple words';
    const truncatedContent = 'This is truncated';

    const result = tokenCounter.countTokensPair(originalContent, truncatedContent);

    expect(result.original).toBe(8);
    expect(result.truncated).toBe(3);
  });

  test('should handle empty content', () => {
    const result = tokenCounter.countTokensPair('', '');

    expect(result.original).toBe(0);
    expect(result.truncated).toBe(0);
  });

  test('should calculate truncation metrics with token counts', () => {
    const processedFiles: ProcessedFile[] = [
      {
        path: 'file1.js',
        content: 'truncated content',
        originalContent: 'original content with more words',
        truncation: {
          truncated: true,
          originalLineCount: 2,
          truncatedLineCount: 1,
          lineLimit: 1,
        },
      },
      {
        path: 'file2.js',
        content: 'unchanged content',
        truncation: {
          truncated: false,
          originalLineCount: 1,
          truncatedLineCount: 1,
          lineLimit: 5,
        },
      },
    ];

    const fileTokenCounts = {
      'file1.js': 3,
      'file2.js': 2,
    };

    const fileOriginalTokenCounts = {
      'file1.js': 6,
      'file2.js': 2,
    };

    const metrics = calculateTruncationMetrics(
      processedFiles,
      { output: { lineLimit: 5 } } as any,
      false,
      fileTokenCounts,
      fileOriginalTokenCounts,
    );

    expect(metrics.totalFilesProcessed).toBe(2);
    expect(metrics.truncatedFilesCount).toBe(1);
    expect(metrics.totalOriginalTokens).toBe(8);
    expect(metrics.totalTruncatedTokens).toBe(5);
    expect(metrics.tokenReductionPercentage).toBe(38); // Round((8-5)/8 * 100 = 38
  });

  test('should handle files without truncation info', () => {
    const processedFiles: ProcessedFile[] = [
      {
        path: 'file1.js',
        content: 'content without truncation info',
      },
    ];

    const fileTokenCounts = {
      'file1.js': 4,
    };

    const metrics = calculateTruncationMetrics(
      processedFiles,
      { output: { lineLimit: 10 } } as any,
      false,
      fileTokenCounts,
      {},
    );

    expect(metrics.totalFilesProcessed).toBe(1);
    expect(metrics.truncatedFilesCount).toBe(0);
    expect(metrics.totalOriginalTokens).toBe(4);
    expect(metrics.totalTruncatedTokens).toBe(4);
    expect(metrics.tokenReductionPercentage).toBe(0);
  });
});
