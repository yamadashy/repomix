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

    // Total tokens are now estimated from per-file counts:
    // countedFileTokens=30, countedFileChars=300, outputChars=300
    // overhead=300-300-0-0=0, so totalTokens=30
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

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      config,
      gitDiffResult,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    expect(progressCallback).toHaveBeenCalledWith('Calculating metrics...');
    expect(calculateSelectiveFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['file2.txt', 'file1.txt'], // sorted by character count desc
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        taskRunner: expect.any(Object),
      }),
    );
    expect(result).toEqual(aggregatedResult);
  });

  it('should estimate output tokens from per-file counts when tokenCountTree is enabled', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    // Output contains file contents (300 chars) + overhead (50 chars of template markup)
    const output = 'a'.repeat(100) + 'b'.repeat(200) + 'x'.repeat(50);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'file1.txt', charCount: 100, tokenCount: 25 },
      { path: 'file2.txt', charCount: 200, tokenCount: 50 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: true },
    });

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
      unref: vi.fn(),
    };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      config,
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Total tokens should be estimated: fileTokens(75) + overhead estimation
    // Overhead chars = 350 - 300 - 0 - 0 = 50 chars
    // Chars per token = 300 / 75 = 4.0
    // Overhead tokens = round(50 / 4.0) = 13
    // Total = 75 + 13 = 88
    expect(result.totalTokens).toBe(88);
    expect(result.totalCharacters).toBe(350);
    expect(result.totalFiles).toBe(2);
    expect(result.fileTokenCounts).toEqual({
      'file1.txt': 25,
      'file2.txt': 50,
    });
  });

  it('should estimate token counts for small files when tokenCountTree is enabled', async () => {
    // 3 files: large (800), medium (200), small (50) = 1050 total
    // 80% threshold = 840 chars → selects large (800) + medium (200) = 1000 >= 840
    // small (50 chars) will be estimated, not BPE-counted
    const processedFiles: ProcessedFile[] = [
      { path: 'small.txt', content: 'a'.repeat(50) },
      { path: 'medium.txt', content: 'b'.repeat(200) },
      { path: 'large.txt', content: 'c'.repeat(800) },
    ];
    const output = 'a'.repeat(50) + 'b'.repeat(200) + 'c'.repeat(800);
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Only large and medium files are BPE-counted
    const fileMetrics = [
      { path: 'large.txt', charCount: 800, tokenCount: 200 },
      { path: 'medium.txt', charCount: 200, tokenCount: 50 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: true },
    });

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
      unref: vi.fn(),
    };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      config,
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Verify only large + medium paths passed to BPE (sorted by size desc)
    expect(calculateSelectiveFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['large.txt', 'medium.txt'],
      'o200k_base',
      progressCallback,
      expect.objectContaining({ taskRunner: expect.any(Object) }),
    );

    // small.txt should be estimated using ratio from BPE-counted files:
    // countedChars=1000, countedTokens=250, charsPerToken=4.0
    // estimated tokens for small.txt = round(50 / 4.0) = 13
    expect(result.fileTokenCounts['large.txt']).toBe(200);
    expect(result.fileTokenCounts['medium.txt']).toBe(50);
    expect(result.fileTokenCounts['small.txt']).toBe(13);

    // Total tokens: 200 + 50 + 13 + overhead(0) = 263
    expect(result.totalTokens).toBe(263);
  });
});
