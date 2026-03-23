import { describe, expect, it, vi } from 'vitest';
import { pack } from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('packager split output', () => {
  it('passes split output results correctly through the packager', async () => {
    const processedFiles = [
      { path: 'a/file1.txt', content: '11111' },
      { path: 'b/file2.txt', content: '22222' },
    ];

    const allFilePaths = ['a/file1.txt', 'b/file2.txt'];
    const mockConfig = createMockConfig({
      cwd: '/test',
      output: {
        filePath: 'repomix-output.xml',
        splitOutput: 12,
        copyToClipboard: false,
        stdout: false,
        git: {
          includeDiffs: false,
          includeLogs: false,
        },
      },
    });

    const produceOutput = vi.fn().mockResolvedValue({
      outputFiles: ['repomix-output.1.xml', 'repomix-output.2.xml'],
      outputForMetrics: ['x'.repeat(10), 'x'.repeat(10)],
    });

    const calculateMetrics = vi.fn().mockResolvedValue({
      totalFiles: 2,
      totalCharacters: 0,
      totalTokens: 0,
      fileCharCounts: {},
      fileTokenCounts: {},
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
    });

    const result = await pack(['root'], mockConfig, () => {}, {
      searchFiles: vi.fn().mockResolvedValue({ filePaths: allFilePaths, emptyDirPaths: [] }),
      sortPaths: vi.fn().mockImplementation((paths) => paths),
      collectFiles: vi.fn().mockResolvedValue({ rawFiles: processedFiles, skippedFiles: [] }),
      processFiles: vi.fn().mockReturnValue(processedFiles),
      validateFileSafety: vi.fn().mockResolvedValue({
        safeFilePaths: allFilePaths,
        safeRawFiles: processedFiles,
        suspiciousFilesResults: [],
        suspiciousGitDiffResults: [],
        suspiciousGitLogResults: [],
      }),
      getGitDiffs: vi.fn().mockResolvedValue(undefined),
      getGitLogs: vi.fn().mockResolvedValue(undefined),
      produceOutput,
      calculateMetrics,
    });

    expect(produceOutput).toHaveBeenCalledWith(
      ['root'],
      mockConfig,
      processedFiles,
      allFilePaths,
      undefined,
      undefined,
      expect.any(Function),
      [{ rootLabel: 'root', files: allFilePaths }],
    );

    expect(calculateMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['x'.repeat(10), 'x'.repeat(10)],
      expect.anything(),
      mockConfig,
      undefined,
      undefined,
    );

    expect(result.outputFiles).toEqual(['repomix-output.1.xml', 'repomix-output.2.xml']);
  });
});
