import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import * as gitDiffModule from '../../../src/core/git/gitDiffHandle.js';
import * as gitRepositoryModule from '../../../src/core/git/gitRepositoryHandle.js';
import { pack } from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Mock the dependencies
vi.mock('../../../src/core/git/gitDiffHandle.js', () => ({
  getWorkTreeDiff: vi.fn(),
  getStagedDiff: vi.fn(),
  getGitDiffs: vi.fn(),
}));

vi.mock('../../../src/core/git/gitRepositoryHandle.js', () => ({
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
    vi.mocked(gitRepositoryModule.isGitRepository).mockResolvedValue(true);
    vi.mocked(gitDiffModule.getWorkTreeDiff).mockResolvedValue(sampleDiff);
    vi.mocked(gitDiffModule.getStagedDiff).mockResolvedValue('');
  });

  test('should not fetch diffs when includeDiffs is disabled', async () => {
    // Mock the dependencies for pack
    const mockSearchFiles = vi.fn().mockResolvedValue({ filePaths: [] });
    const mockCollectFiles = vi.fn().mockResolvedValue({ rawFiles: [], skippedFiles: [] });
    const mockProcessFiles = vi.fn().mockResolvedValue([]);
    const mockValidateFileSafety = vi.fn().mockResolvedValue({
      safeFilePaths: [],
      safeRawFiles: [],
      suspiciousFilesResults: [],
    });
    const mockProduceOutput = vi.fn().mockResolvedValue({
      outputForMetrics: 'mocked output',
    });
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
      validateFileSafety: mockValidateFileSafety,
      produceOutput: mockProduceOutput,
      calculateMetrics: mockCalculateMetrics,
      sortPaths: mockSortPaths,
    });

    // Should not call getWorkTreeDiff
    expect(gitDiffModule.getWorkTreeDiff).not.toHaveBeenCalled();
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
    const mockCollectFiles = vi.fn().mockResolvedValue({ rawFiles: processedFiles, skippedFiles: [] });
    const mockProcessFiles = vi.fn().mockResolvedValue(processedFiles);
    const mockValidateFileSafety = vi.fn().mockResolvedValue({
      safeFilePaths: ['test.js'],
      safeRawFiles: processedFiles,
      suspiciousFilesResults: [],
    });
    const mockProduceOutput = vi.fn().mockResolvedValue({
      outputForMetrics: 'Generated output with diffs included',
    });
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
      validateFileSafety: mockValidateFileSafety,
      produceOutput: mockProduceOutput,
      calculateMetrics: mockCalculateMetrics,
      sortPaths: mockSortPaths,
    });

    // Check gitDiffTokenCount in the result
    expect(result.gitDiffTokenCount).toBe(15);
  });
});
