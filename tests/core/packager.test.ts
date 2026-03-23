import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { pack } from '../../src/core/packager.js';
import { createMockConfig } from '../testing/testUtils.js';

vi.mock('node:fs/promises');
vi.mock('fs/promises');
vi.mock('../../src/core/metrics/TokenCounter.js', () => ({
  TokenCounter: {
    create: vi.fn(),
  },
}));

describe('packager', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const { TokenCounter } = await import('../../src/core/metrics/TokenCounter.js');
    vi.mocked(TokenCounter.create).mockResolvedValue({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof TokenCounter.create>>);
  });

  test('pack should orchestrate packing files and generating output', async () => {
    const file2Path = path.join('dir1', 'file2.txt');
    const mockRawFiles = [
      { path: 'file1.txt', content: 'raw content 1' },
      { path: file2Path, content: 'raw content 2' },
    ];
    const mockSafeRawFiles = [
      { path: 'file1.txt', content: 'safed content 1' },
      { path: file2Path, content: 'safed content 2' },
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
        safeRawFiles: mockSafeRawFiles,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
      }),
      produceOutput: vi.fn().mockResolvedValue({
        outputForMetrics: mockOutput,
      }),
      createFileProcessTaskRunner: vi.fn().mockReturnValue({
        run: vi.fn(),
        cleanup: vi.fn(),
      }),
      createSecurityTaskRunner: vi.fn().mockReturnValue({
        run: vi.fn(),
        cleanup: vi.fn(),
      }),
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
      { runSecurityCheck: expect.any(Function) },
    );
    // processFiles receives ALL raw files (not just safe ones) because processing
    // runs in parallel with security check, then results are filtered after.
    // Default config (no compress/removeComments) uses main-thread processing, no taskRunner
    expect(mockDeps.processFiles).toHaveBeenCalledWith(mockRawFiles, mockConfig, progressCallback, {});
    expect(mockDeps.produceOutput).toHaveBeenCalledWith(
      ['root'],
      mockConfig,
      mockProcessedFiles,
      mockFilePaths,
      undefined,
      undefined,
      progressCallback,
      [{ rootLabel: 'root', files: mockFilePaths }],
      [],
    );
    // calculateMetrics receives pre-computed metrics (file + git token counts computed
    // on main thread in parallel with security workers)
    expect(mockDeps.calculateMetrics).toHaveBeenCalledWith(
      mockProcessedFiles,
      mockOutput,
      progressCallback,
      mockConfig,
      undefined,
      undefined,
      {
        precomputedMetrics: {
          fileMetrics: expect.any(Array),
          gitDiffTokenCount: expect.any(Number),
          gitLogTokenCount: expect.any(Number),
        },
      },
    );

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
