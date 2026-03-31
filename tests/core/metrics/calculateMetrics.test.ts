import { describe, expect, it, type Mock, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateMetrics } from '../../../src/core/metrics/calculateMetrics.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/metrics/TokenCounter.js', () => {
  return {
    TOKEN_ENCODINGS: ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'],
    TokenCounter: vi.fn().mockImplementation(() => ({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    })),
  };
});
vi.mock('../../../src/core/metrics/aggregateMetrics.js');
vi.mock('../../../src/core/metrics/calculateSelectiveFileMetrics.js', () => ({
  calculateSelectiveFileMetrics: vi.fn(),
}));

describe('calculateMetrics', () => {
  it('should use numeric threshold to pre-filter files when tokenCountTree is a number', async () => {
    // 3 files: large (50k chars), medium (10k), small (1k)
    const processedFiles: ProcessedFile[] = [
      { path: 'large.ts', content: 'a'.repeat(50000) },
      { path: 'medium.ts', content: 'b'.repeat(10000) },
      { path: 'small.ts', content: 'c'.repeat(1000) },
    ];
    const output = 'x'.repeat(61000);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'large.ts', charCount: 50000, tokenCount: 12500 },
      { path: 'medium.ts', charCount: 10000, tokenCount: 2500 },
      { path: 'small.ts', charCount: 1000, tokenCount: 250 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    // tokenCountTree: 20000 → charThreshold = 20000 * 2 = 40000
    // Only large.ts (50k) exceeds charThreshold, but all 3 included via top files + sample
    const config = createMockConfig({
      output: { topFilesLength: 5, tokenCountTree: 20000 },
    });

    const mockTaskRunner = { run: vi.fn(), cleanup: vi.fn(), unref: vi.fn() };

    await calculateMetrics(processedFiles, output, progressCallback, config, undefined, undefined, {
      calculateSelectiveFileMetrics,
      calculateOutputMetrics: async () => 15000,
      calculateGitDiffMetrics: () => Promise.resolve(0),
      calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
      taskRunner: mockTaskRunner,
    });

    // With numeric threshold, shouldEstimateOutputTokens=true, so calculateOutputMetrics should NOT be called
    // Verify that selectiveFileMetrics was called (not all 3 files necessarily, but at least a subset)
    expect(calculateSelectiveFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      expect.any(Array),
      'o200k_base',
      progressCallback,
      expect.objectContaining({ taskRunner: expect.any(Object) }),
    );

    // The target paths should include large.ts (tree candidate) and all files (top files since topFilesLength=5 > 3 files)
    const targetPaths = (calculateSelectiveFileMetrics as unknown as Mock).mock.calls[0][1] as string[];
    expect(targetPaths).toContain('large.ts');
  });

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

    const aggregatedResult = {
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
    };

    const config = createMockConfig();

    const gitDiffResult: GitDiffResult | undefined = undefined;

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
      unref: vi.fn(),
    };

    const result = await calculateMetrics(processedFiles, output, progressCallback, config, gitDiffResult, undefined, {
      calculateSelectiveFileMetrics,
      calculateOutputMetrics: async () => 30,
      calculateGitDiffMetrics: () => Promise.resolve(0),
      calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
      taskRunner: mockTaskRunner,
    });

    expect(progressCallback).toHaveBeenCalledWith('Calculating metrics...');
    expect(calculateSelectiveFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      expect.arrayContaining(['file1.txt', 'file2.txt']),
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        taskRunner: expect.any(Object),
      }),
    );
    expect(result).toEqual(aggregatedResult);
  });
});
