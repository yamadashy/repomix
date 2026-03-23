import { describe, expect, it, type Mock, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateMetrics } from '../../../src/core/metrics/calculateMetrics.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/metrics/TokenCounter.js', () => ({
  TokenCounter: {
    create: vi.fn().mockResolvedValue({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    }),
  },
}));
vi.mock('../../../src/core/metrics/aggregateMetrics.js');
vi.mock('../../../src/core/metrics/calculateSelectiveFileMetrics.js', () => ({
  calculateSelectiveFileMetrics: vi.fn(),
}));

describe('calculateMetrics', () => {
  it('should calculate metrics and return the result', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    const output = 'a'.repeat(300);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'file1.txt', charCount: 100, tokenCount: 10 },
      { path: 'file2.txt', charCount: 200, tokenCount: 20 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig();

    const gitDiffResult: GitDiffResult | undefined = undefined;

    const result = await calculateMetrics(processedFiles, output, progressCallback, config, gitDiffResult, undefined, {
      calculateSelectiveFileMetrics,
      calculateGitDiffMetrics: () => Promise.resolve(0),
      calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
    });

    expect(progressCallback).toHaveBeenCalledWith('Calculating metrics...');
    // Now counts ALL files (not just top N), so paths are in original order
    expect(calculateSelectiveFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['file1.txt', 'file2.txt'],
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        tokenCounter: expect.any(Object),
      }),
    );

    // totalTokens is estimated from file token ratio:
    // sum(fileTokens)=30, sum(fileChars)=300, totalChars=300
    // overheadChars = 300 - 300 = 0, so totalTokens = 30
    expect(result).toEqual({
      totalFiles: 2,
      totalCharacters: 300,
      totalTokens: 30,
      fileCharCounts: {
        'file1.txt': 100,
        'file2.txt': 200,
      },
      fileTokenCounts: {
        'file1.txt': 10,
        'file2.txt': 20,
      },
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
    });
  });
});
