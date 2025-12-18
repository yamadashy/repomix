import { describe, expect, it, vi } from 'vitest';
import { pack } from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('packager split output', () => {
  it('writes multiple numbered output files without splitting within a root folder', async () => {
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

    const writeOutputToDisk = vi.fn().mockResolvedValue(undefined);
    const generateOutput = vi.fn().mockImplementation(async (_rootDirs, _config, processedFilesArg) => {
      // Make output size depend on number of processed files in this chunk
      const chunkSize = (processedFilesArg as typeof processedFiles).length === 1 ? 10 : 25;
      return 'x'.repeat(chunkSize);
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
      generateOutput,
      writeOutputToDisk,
      copyToClipboardIfEnabled: vi.fn().mockResolvedValue(undefined),
      calculateMetrics,
    });

    expect(generateOutput).toHaveBeenCalled();
    expect(writeOutputToDisk).toHaveBeenCalledTimes(2);

    const firstConfig = writeOutputToDisk.mock.calls[0][1];
    const secondConfig = writeOutputToDisk.mock.calls[1][1];
    expect(firstConfig.output.filePath).toBe('repomix-output.1.xml');
    expect(secondConfig.output.filePath).toBe('repomix-output.2.xml');

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

