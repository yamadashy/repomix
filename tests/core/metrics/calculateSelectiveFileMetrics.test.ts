import { describe, expect, it, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateSelectiveFileMetrics } from '../../../src/core/metrics/calculateSelectiveFileMetrics.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

describe('calculateSelectiveFileMetrics', () => {
  const mockGetTokenCounter = async () => {
    const counter = new TokenCounter('o200k_base');
    await counter.init();
    return counter;
  };

  it('should calculate metrics for selective files only', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
      { path: 'file3.txt', content: 'c'.repeat(300) },
    ];
    const targetFilePaths = ['file1.txt', 'file3.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        getTokenCounter: mockGetTokenCounter,
      },
    );

    expect(result.length).toBe(2);
    expect(result[0].path).toBe('file1.txt');
    expect(result[0].charCount).toBe(100);
    expect(result[0].tokenCount).toBeGreaterThan(0);
    expect(result[1].path).toBe('file3.txt');
    expect(result[1].charCount).toBe(300);
    expect(result[1].tokenCount).toBeGreaterThan(0);
  });

  it('should return empty array when no target files match', async () => {
    const processedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'a'.repeat(100) }];
    const targetFilePaths = ['nonexistent.txt'];
    const progressCallback: RepomixProgressCallback = vi.fn();

    const result = await calculateSelectiveFileMetrics(
      processedFiles,
      targetFilePaths,
      'o200k_base',
      progressCallback,
      {
        getTokenCounter: mockGetTokenCounter,
      },
    );

    expect(result).toEqual([]);
  });
});
