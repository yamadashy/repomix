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
      ['file2.txt', 'file1.txt'], // sorted by character count desc
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        taskRunner: expect.any(Object),
      }),
    );

    // totalTokens is estimated from chars/token ratio of the selectively tokenized files.
    // With 300 chars of file content at a ratio of 10 chars/token, the estimated total
    // for a 300-char output is 30.
    expect(result.totalFiles).toBe(aggregatedResult.totalFiles);
    expect(result.totalCharacters).toBe(aggregatedResult.totalCharacters);
    expect(result.totalTokens).toBe(30); // 300 chars / (300 chars / 30 tokens) = 30
    expect(result.fileCharCounts).toEqual(aggregatedResult.fileCharCounts);
    expect(result.fileTokenCounts).toEqual(aggregatedResult.fileTokenCounts);
    expect(result.gitDiffTokenCount).toBe(aggregatedResult.gitDiffTokenCount);
    expect(result.gitLogTokenCount).toBe(aggregatedResult.gitLogTokenCount);
  });

  it('should use default ratio when no files are tokenized', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'a'.repeat(375) }];
    const output = 'a'.repeat(375);

    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue([]);

    const mockTaskRunner = { run: vi.fn(), cleanup: vi.fn() };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      vi.fn(),
      createMockConfig(),
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Default ratio of 3.75 chars/token: 375 / 3.75 = 100
    expect(result.totalTokens).toBe(100);
  });

  it('should return zero tokens for empty output', async () => {
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue([]);

    const mockTaskRunner = { run: vi.fn(), cleanup: vi.fn() };

    const result = await calculateMetrics([], Promise.resolve(''), vi.fn(), createMockConfig(), undefined, undefined, {
      calculateSelectiveFileMetrics,
      calculateGitDiffMetrics: () => Promise.resolve(0),
      calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
      taskRunner: mockTaskRunner,
    });

    expect(result.totalTokens).toBe(0);
    expect(result.totalCharacters).toBe(0);
  });

  it('should estimate token counts for non-top files when tokenCountTree is enabled', async () => {
    // 4 files, but only top 2 by size will be exactly tokenized (topFilesLength=1, so top 1*10=10, but min slice is 2)
    const processedFiles: ProcessedFile[] = [
      { path: 'big.txt', content: 'a'.repeat(400) },
      { path: 'medium.txt', content: 'b'.repeat(200) },
      { path: 'small1.txt', content: 'c'.repeat(100) },
      { path: 'small2.txt', content: 'd'.repeat(50) },
    ];
    const output = 'x'.repeat(750);

    // Only top 2 files are exactly tokenized
    const fileMetrics = [
      { path: 'big.txt', charCount: 400, tokenCount: 100 },
      { path: 'medium.txt', charCount: 200, tokenCount: 50 },
    ];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: 50000, topFilesLength: 1 },
    });

    const mockTaskRunner = { run: vi.fn(), cleanup: vi.fn() };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      vi.fn(),
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

    // All 4 files should have token counts
    expect(Object.keys(result.fileTokenCounts)).toHaveLength(4);
    // Top files have exact counts
    expect(result.fileTokenCounts['big.txt']).toBe(100);
    expect(result.fileTokenCounts['medium.txt']).toBe(50);
    // Remaining files have estimated counts based on calibrated ratio
    // sampleRatio = 600/150 = 4.0, coverage = 600/750 = 0.8
    // blendedRatio = 4.0 * 0.8 + 3.75 * 0.2 = 3.95
    // small1.txt: round(100 / 3.95) = round(25.32) = 25
    // small2.txt: round(50 / 3.95) = round(12.66) = 13
    expect(result.fileTokenCounts['small1.txt']).toBe(25);
    expect(result.fileTokenCounts['small2.txt']).toBe(13);
  });

  it('should not estimate token counts when tokenCountTree is disabled', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'big.txt', content: 'a'.repeat(400) },
      { path: 'small.txt', content: 'b'.repeat(100) },
    ];

    const fileMetrics = [{ path: 'big.txt', charCount: 400, tokenCount: 100 }];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const config = createMockConfig({
      output: { tokenCountTree: false, topFilesLength: 1 },
    });

    const mockTaskRunner = { run: vi.fn(), cleanup: vi.fn() };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve('x'.repeat(500)),
      vi.fn(),
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

    // Only the exactly-tokenized file should have a token count
    expect(Object.keys(result.fileTokenCounts)).toHaveLength(1);
    expect(result.fileTokenCounts['big.txt']).toBe(100);
    expect(result.fileTokenCounts['small.txt']).toBeUndefined();
  });

  it('should blend sample ratio with default when sample coverage is partial', async () => {
    // Sample covers 50% of file content: 2 files, only the larger one tokenized
    const processedFiles: ProcessedFile[] = [
      { path: 'small.txt', content: 'a'.repeat(100) },
      { path: 'large.txt', content: 'b'.repeat(100) },
    ];
    const output = 'x'.repeat(200);

    // Only one file tokenized, covering 50% of total file content
    const fileMetrics = [{ path: 'large.txt', charCount: 100, tokenCount: 25 }];
    (calculateSelectiveFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const mockTaskRunner = { run: vi.fn(), cleanup: vi.fn() };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      vi.fn(),
      createMockConfig(),
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // sampleRatio = 100/25 = 4.0, coverage = 100/200 = 0.5
    // blendedRatio = 4.0 * 0.5 + 3.75 * 0.5 = 3.875
    // totalTokens = round(200 / 3.875) = round(51.61) = 52
    expect(result.totalTokens).toBe(52);
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

  it('should fire a warmup task with empty content', async () => {
    const result = createMetricsTaskRunner(50, 'cl100k_base');

    await result.warmupPromise;

    expect(result.taskRunner.run).toHaveBeenCalledWith({ content: '', encoding: 'cl100k_base' });
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
