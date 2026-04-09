import { describe, expect, it, type Mock, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateMetrics, createMetricsTaskRunner } from '../../../src/core/metrics/calculateMetrics.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/shared/processConcurrency.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/shared/processConcurrency.js')>();
  return {
    ...original,
    initTaskRunner: vi.fn(() => ({
      run: vi.fn().mockResolvedValue(0),
      cleanup: vi.fn().mockResolvedValue(undefined),
    })),
  };
});
vi.mock('../../../src/core/metrics/TokenCounter.js', () => {
  return {
    TOKEN_ENCODINGS: ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'],
    TokenCounter: vi.fn().mockImplementation(() => ({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    })),
    loadBpeRanks: vi.fn().mockResolvedValue(['mock-bpe-data']),
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
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    expect(progressCallback).toHaveBeenCalledWith('Calculating metrics...');
    expect(calculateSelectiveFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['file1.txt', 'file2.txt'], // all files
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        taskRunner: expect.any(Object),
      }),
    );
    expect(result).toEqual(aggregatedResult);
  });

  it('should only tokenize large files and estimate the rest when tokenCountTree is a threshold number', async () => {
    vi.mocked(calculateSelectiveFileMetrics).mockClear();

    // Create files: one large (above char threshold for 500 tokens) and two small
    // charThreshold = 500 * 5 (MAX_CHARS_PER_TOKEN) = 2500
    const processedFiles: ProcessedFile[] = [
      { path: 'large.txt', content: 'a'.repeat(3000) },
      { path: 'small1.txt', content: 'b'.repeat(100) },
      { path: 'small2.txt', content: 'c'.repeat(200) },
    ];
    const output = 'x'.repeat(3300);
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Only large.txt + top-50 sample (all 3 files since < 50) are tokenized
    const fileMetrics = [
      { path: 'large.txt', charCount: 3000, tokenCount: 900 },
      { path: 'small1.txt', charCount: 100, tokenCount: 30 },
      { path: 'small2.txt', charCount: 200, tokenCount: 60 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: 500 },
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
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // selectFilesAboveThreshold should be called with a subset (not all files)
    // The call includes files above charThreshold (2500) + top 50 by size
    const selectCall = (calculateSelectiveFileMetrics as unknown as Mock).mock.calls[0];
    const targetPaths = selectCall[1] as string[];
    // All 3 files are included: large.txt exceeds charThreshold, and all 3 are in top-50
    expect(targetPaths).toContain('large.txt');

    // fileTokenCounts should include ALL files (tokenized + estimated)
    expect(result.fileTokenCounts).toHaveProperty('large.txt');
    expect(result.fileTokenCounts).toHaveProperty('small1.txt');
    expect(result.fileTokenCounts).toHaveProperty('small2.txt');

    // Token counts for tokenized files should be exact
    expect(result.fileTokenCounts['large.txt']).toBe(900);
    expect(result.fileTokenCounts['small1.txt']).toBe(30);
    expect(result.fileTokenCounts['small2.txt']).toBe(60);
  });

  it('should estimate output tokens from file token counts plus structural overhead ratio', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    // Output = file content (300 chars) + structural overhead (60 chars of XML tags etc.)
    const output = 'a'.repeat(100) + '<tag>' + 'b'.repeat(200) + '</tag>' + 'x'.repeat(49);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'file1.txt', charCount: 100, tokenCount: 25 },
      { path: 'file2.txt', charCount: 200, tokenCount: 50 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig();

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
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Total tokens = fileTokenSum + round(structuralOverhead * tokenCharRatio)
    // fileTokenSum = 75, fileCharSum = 300
    // structuralOverheadChars = output.length(360) - 300 = 60
    // tokenCharRatio = 75 / 300 = 0.25
    // totalTokens = round(75 + 60 * 0.25 + 0 + 0) = 90
    expect(result.totalTokens).toBe(90);
    expect(result.totalFiles).toBe(2);
  });
});

describe('createMetricsTaskRunner', () => {
  it('should return a taskRunner and warmupPromise', async () => {
    const result = createMetricsTaskRunner(100, 'o200k_base');

    expect(result).toHaveProperty('taskRunner');
    expect(result).toHaveProperty('warmupPromise');
    expect(result.taskRunner).toHaveProperty('run');
    expect(result.taskRunner).toHaveProperty('cleanup');

    // warmupPromise should resolve without error
    await expect(result.warmupPromise).resolves.toBeDefined();
  });

  it('should fire a warmup task with empty content and pre-loaded BPE data', async () => {
    const result = createMetricsTaskRunner(50, 'cl100k_base');

    await result.warmupPromise;

    expect(result.taskRunner.run).toHaveBeenCalledWith({
      content: '',
      encoding: 'cl100k_base',
      bpeRanksJson: expect.any(String),
    });
  });

  it('should swallow warmup task errors', async () => {
    const { initTaskRunner } = await import('../../../src/shared/processConcurrency.js');
    (initTaskRunner as Mock).mockReturnValueOnce({
      run: vi.fn().mockRejectedValue(new Error('init failed')),
      cleanup: vi.fn(),
    });

    const result = createMetricsTaskRunner(10, 'o200k_base');

    // warmupPromise should resolve (errors swallowed by .catch on each task)
    const resolved = await result.warmupPromise;
    expect(Array.isArray(resolved)).toBe(true);
    expect((resolved as number[]).every((v) => v === 0)).toBe(true);
  });
});
