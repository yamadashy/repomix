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
        calculateOutputMetrics: async () => 30,
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

  it('should derive output tokens from file metrics when tokenCountTree is enabled', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    // Output is 400 chars: 300 from files + 100 template overhead
    const output = 'x'.repeat(400);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'file1.txt', charCount: 100, tokenCount: 10 },
      { path: 'file2.txt', charCount: 200, tokenCount: 20 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: 50000 },
    });

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

    const calculateOutputMetrics = vi.fn().mockResolvedValue(999);

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      config,
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateOutputMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // calculateOutputMetrics should NOT be called when deriving from file metrics
    expect(calculateOutputMetrics).not.toHaveBeenCalled();

    // Derived total: sumFileTokens(30) + overhead estimate
    // overhead = (400 - 300) * (30/300) = 100 * 0.1 = 10
    // total = 30 + 10 = 40
    expect(result.totalTokens).toBe(40);
    expect(result.totalCharacters).toBe(400);
  });

  it('should use full output token counting when output is split', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'a'.repeat(100) }];
    const outputParts = ['part1', 'part2'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [{ path: 'file1.txt', charCount: 100, tokenCount: 10 }];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: 50000 },
    });

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

    const calculateOutputMetrics = vi.fn().mockResolvedValue(50);

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(outputParts),
      progressCallback,
      config,
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateOutputMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // With split output, calculateOutputMetrics should be called for each part
    expect(calculateOutputMetrics).toHaveBeenCalledTimes(2);
    expect(result.totalTokens).toBe(100); // 50 per part * 2
  });

  it('should handle empty file metrics in derivation', async () => {
    const processedFiles: ProcessedFile[] = [];
    const output = 'x'.repeat(200);
    const progressCallback: RepomixProgressCallback = vi.fn();

    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue([]);

    const config = createMockConfig({
      output: { tokenCountTree: 50000 },
    });

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
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
        calculateOutputMetrics: vi.fn().mockResolvedValue(999),
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // With empty files: sumFileTokens=0, sumFileChars=0, fallback ratio=0.25
    // total = 0 + Math.round(200 * 0.25) = 50
    expect(result.totalTokens).toBe(50);
  });
});
