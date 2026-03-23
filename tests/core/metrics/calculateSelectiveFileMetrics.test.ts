import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import type { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

const createMockTokenCounter = (countFn?: (...args: unknown[]) => number): TokenCounter => {
  return {
    countTokens: countFn ?? vi.fn().mockReturnValue(10),
    free: vi.fn(),
  } as unknown as TokenCounter;
};

describe('calculateSelectiveFileMetrics', () => {
  it('should calculate metrics for selective files only', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
      { path: 'file3.txt', content: 'c'.repeat(300) },
    ];
    const targetFilePaths = ['file1.txt', 'file3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const countFn = vi.fn().mockReturnValueOnce(13).mockReturnValueOnce(75);
    const tokenCounter = createMockTokenCounter(countFn);

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        tokenCounter,
      },
    );

    expect(result).toEqual([
      { path: 'file1.txt', charCount: 100, tokenCount: 13 },
      { path: 'file3.txt', charCount: 300, tokenCount: 75 },
    ]);
  });

  it('should return empty array when no target files match', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'a'.repeat(100) }];
    const targetFilePaths = ['nonexistent.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const tokenCounter = createMockTokenCounter();

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        tokenCounter,
      },
    );

    expect(result).toEqual([]);
  });
});
