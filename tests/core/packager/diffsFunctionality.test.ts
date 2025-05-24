import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { getStagedDiff } from '../../../src/core/git/getStagedDiff.js';
import { getWorkTreeDiff } from '../../../src/core/git/getWorkTreeDiff.js';
import { isGitRepository } from '../../../src/core/git/gitHandle.js';
import { pack } from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Mock the modules
vi.mock('../../../src/core/git/gitHandle.js');
vi.mock('../../../src/core/git/getStagedDiff.js');
vi.mock('../../../src/core/git/getWorkTreeDiff.js');

// Mock the dependencies
vi.mock('../../../src/core/git/gitCommand.js', () => ({
  getWorkTreeDiff: vi.fn(),
  getStagedDiff: vi.fn(),
  isGitRepository: vi.fn(),
}));

describe('Git Diffs Functionality', () => {
  let mockConfig: RepomixConfigMerged;
  const mockRootDir = '/test/repo';
  const sampleDiff = `diff --git a/file1.js b/file1.js
index 123..456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,5 +1,5 @@
-old line
+new line
`;

  beforeEach(() => {
    vi.resetAllMocks();

    // Sample minimal config using createMockConfig utility
    mockConfig = createMockConfig({
      cwd: mockRootDir,
      output: {
        filePath: 'repomix-output.txt',
        style: 'plain',
        git: {
          includeDiffs: false,
        },
      },
    });

    // Set up our mocks
    vi.mocked(isGitRepository).mockResolvedValue(true);
    vi.mocked(getWorkTreeDiff).mockResolvedValue(sampleDiff);
    vi.mocked(getStagedDiff).mockResolvedValue('');
  });

  test('should not fetch diffs when includeDiffs is disabled', async () => {
    // Mock the dependencies for pack
    const mockSearchFiles = vi.fn().mockResolvedValue({ filePaths: [] });
    const mockCollectFiles = vi.fn().mockResolvedValue([]);
    const mockProcessFiles = vi.fn().mockResolvedValue([]);
    const mockGenerateOutput = vi.fn().mockResolvedValue('mocked output');
    const mockValidateFileSafety = vi.fn().mockResolvedValue({
      safeFilePaths: [],
      safeRawFiles: [],
      suspiciousFilesResults: [],
    });
    const mockHandleOutput = vi.fn().mockResolvedValue(undefined);
    const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);
    const mockCalculateMetrics = vi.fn().mockResolvedValue({
      totalFiles: 0,
      totalCharacters: 0,
      totalTokens: 0,
      fileCharCounts: {},
      fileTokenCounts: {},
    });
    const mockSortPaths = vi.fn().mockImplementation((paths) => paths);

    // Config with diffs disabled
    if (mockConfig.output.git) {
      mockConfig.output.git.includeDiffs = false;
    }

    await pack([mockRootDir], mockConfig, vi.fn(), {
      searchFiles: mockSearchFiles,
      collectFiles: mockCollectFiles,
      processFiles: mockProcessFiles,
      generateOutput: mockGenerateOutput,
      validateFileSafety: mockValidateFileSafety,
      handleOutput: mockHandleOutput,
      copyToClipboardIfEnabled: mockCopyToClipboard,
      calculateMetrics: mockCalculateMetrics,
      sortPaths: mockSortPaths,
    });

    // Should not call getWorkTreeDiff
    expect(getWorkTreeDiff).not.toHaveBeenCalled();
  });

  test('should calculate diff token count correctly', async () => {
    // Create a processed files array with a sample file
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    // Mock dependencies
    const mockSearchFiles = vi.fn().mockResolvedValue({ filePaths: ['test.js'] });
    const mockCollectFiles = vi.fn().mockResolvedValue(processedFiles);
    const mockProcessFiles = vi.fn().mockResolvedValue(processedFiles);
    const mockGenerateOutput = vi.fn().mockResolvedValue('Generated output with diffs included');
    const mockValidateFileSafety = vi.fn().mockResolvedValue({
      safeFilePaths: ['test.js'],
      safeRawFiles: processedFiles,
      suspiciousFilesResults: [],
    });
    const mockHandleOutput = vi.fn().mockResolvedValue(undefined);
    const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);
    const mockCalculateMetrics = vi.fn().mockResolvedValue({
      totalFiles: 1,
      totalCharacters: 30,
      totalTokens: 10,
      fileCharCounts: { 'test.js': 10 },
      fileTokenCounts: { 'test.js': 5 },
      gitDiffTokenCount: 15, // Mock diff token count
    });
    const mockSortPaths = vi.fn().mockImplementation((paths) => paths);

    // Config with diffs enabled
    if (mockConfig.output.git) {
      mockConfig.output.git.includeDiffs = true;
    }

    const result = await pack([mockRootDir], mockConfig, vi.fn(), {
      searchFiles: mockSearchFiles,
      collectFiles: mockCollectFiles,
      processFiles: mockProcessFiles,
      generateOutput: mockGenerateOutput,
      validateFileSafety: mockValidateFileSafety,
      handleOutput: mockHandleOutput,
      copyToClipboardIfEnabled: mockCopyToClipboard,
      calculateMetrics: mockCalculateMetrics,
      sortPaths: mockSortPaths,
    });

    // Check gitDiffTokenCount in the result
    expect(result.gitDiffTokenCount).toBe(15);
  });
});
