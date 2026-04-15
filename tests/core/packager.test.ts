import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { pack } from '../../src/core/packager.js';
import { createMockConfig } from '../testing/testUtils.js';

vi.mock('node:fs/promises');
vi.mock('fs/promises');
vi.mock('../../src/core/metrics/TokenCounter.js', () => {
  return {
    TOKEN_ENCODINGS: ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'],
    TokenCounter: vi.fn().mockImplementation(() => ({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    })),
  };
});

describe('packager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('pack should orchestrate packing files and generating output', async () => {
    const file2Path = path.join('dir1', 'file2.txt');
    const mockRawFiles = [
      { path: 'file1.txt', content: 'raw content 1' },
      { path: file2Path, content: 'raw content 2' },
    ];
    const mockProcessedFiles = [
      { path: 'file1.txt', content: 'processed content 1' },
      { path: file2Path, content: 'processed content 2' },
    ];
    const mockOutput = 'mock output';
    const mockFilePaths = ['file1.txt', file2Path];

    const mockDeps = {
      searchFiles: vi.fn().mockResolvedValue({
        filePaths: mockFilePaths,
        emptyDirPaths: [],
      }),
      sortPaths: vi.fn().mockImplementation((paths) => paths),
      collectFiles: vi.fn().mockResolvedValue({ rawFiles: mockRawFiles, skippedFiles: [] }),
      processFiles: vi.fn().mockReturnValue(mockProcessedFiles),
      validateFileSafety: vi.fn().mockResolvedValue({
        safeFilePaths: mockFilePaths,
        safeRawFiles: mockRawFiles,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
      }),
      produceOutput: vi.fn().mockResolvedValue({
        outputForMetrics: mockOutput,
      }),
      createMetricsTaskRunner: vi.fn().mockResolvedValue({
        taskRunner: {
          run: vi.fn().mockResolvedValue(0),
          cleanup: vi.fn().mockResolvedValue(undefined),
        },
        warmupPromise: Promise.resolve(),
      }),
      prefetchSortData: vi.fn().mockResolvedValue(undefined),
      getProcessConcurrency: vi.fn().mockReturnValue(4),
      calculateMetrics: vi.fn().mockResolvedValue({
        totalFiles: 2,
        totalCharacters: 11,
        totalTokens: 10,
        fileCharCounts: {
          'file1.txt': 19,
          [file2Path]: 19,
        },
        fileTokenCounts: {
          'file1.txt': 10,
          [file2Path]: 10,
        },
        gitDiffTokenCount: 0,
        gitLogTokenCount: 0,
      }),
    };

    const mockConfig = createMockConfig();
    const progressCallback = vi.fn();
    const result = await pack(['root'], mockConfig, progressCallback, mockDeps);

    expect(mockDeps.searchFiles).toHaveBeenCalledWith('root', mockConfig, undefined);
    expect(mockDeps.collectFiles).toHaveBeenCalledWith(mockFilePaths, 'root', mockConfig, progressCallback);
    expect(mockDeps.validateFileSafety).toHaveBeenCalled();
    expect(mockDeps.processFiles).toHaveBeenCalled();
    expect(mockDeps.produceOutput).toHaveBeenCalled();
    expect(mockDeps.calculateMetrics).toHaveBeenCalled();

    expect(mockDeps.validateFileSafety).toHaveBeenCalledWith(
      mockRawFiles,
      progressCallback,
      mockConfig,
      undefined,
      undefined,
      expect.objectContaining({
        runSecurityCheck: expect.anything(),
        filterOutUntrustedFiles: expect.anything(),
      }),
    );
    expect(mockDeps.processFiles).toHaveBeenCalledWith(mockRawFiles, mockConfig, progressCallback);
    expect(mockDeps.produceOutput).toHaveBeenCalledWith(
      ['root'],
      mockConfig,
      mockProcessedFiles,
      mockFilePaths,
      undefined,
      undefined,
      progressCallback,
      [{ rootLabel: 'root', files: mockFilePaths }],
      undefined,
    );
    expect(mockDeps.calculateMetrics).toHaveBeenCalledWith(
      mockProcessedFiles,
      expect.anything(),
      progressCallback,
      mockConfig,
      undefined,
      undefined,
      expect.objectContaining({ taskRunner: expect.anything() }),
    );

    // Verify that calculateMetrics received a promise that resolves to the expected output
    const outputArg = mockDeps.calculateMetrics.mock.calls[0][1];
    await expect(outputArg).resolves.toBe(mockOutput);

    // Check the result of pack function
    expect(result.totalFiles).toBe(2);
    expect(result.totalCharacters).toBe(11);
    expect(result.totalTokens).toBe(10);
    expect(result.fileCharCounts).toEqual({
      'file1.txt': 19,
      [file2Path]: 19,
    });
    expect(result.fileTokenCounts).toEqual({
      'file1.txt': 10,
      [file2Path]: 10,
    });
    expect(result.skippedFiles).toEqual([]);
  });
});
