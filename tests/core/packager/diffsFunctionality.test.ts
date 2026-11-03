import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { getGitDiffs } from '../../../src/core/git/gitDiffHandle.js';
import { pack } from '../../../src/core/packager.js';
import { createMetricsTaskRunnerDouble } from '../../testing/taskRunnerDoubles.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('Git Diffs Functionality', () => {
  let mockConfig: RepomixConfigMerged;
  let mockGetWorkTreeDiff: Mock<(directory: string) => Promise<string>>;
  let mockGetStagedDiff: Mock<(directory: string) => Promise<string>>;
  // Run the real getGitDiffs so its includeDiffs gate is exercised, but route the
  // git commands to spies. Git sort is stubbed out so no git subprocess runs.
  let gitDeps: Pick<NonNullable<Parameters<typeof pack>[3]>, 'getGitDiffs' | 'prefetchSortData' | 'sortOutputFiles'>;
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

    mockGetWorkTreeDiff = vi.fn<(directory: string) => Promise<string>>().mockResolvedValue(sampleDiff);
    mockGetStagedDiff = vi.fn<(directory: string) => Promise<string>>().mockResolvedValue('');
    gitDeps = {
      getGitDiffs: (rootDirs, config) =>
        getGitDiffs(rootDirs, config, { getWorkTreeDiff: mockGetWorkTreeDiff, getStagedDiff: mockGetStagedDiff }),
      prefetchSortData: vi.fn().mockResolvedValue(undefined),
      sortOutputFiles: vi.fn().mockImplementation(async (files) => files),
    };
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
    const mockCreateMetricsTaskRunner = createMetricsTaskRunnerDouble().createMetricsTaskRunner;

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
      createMetricsTaskRunner: mockCreateMetricsTaskRunner,
      sortPaths: mockSortPaths,
      ...gitDeps,
    });

    // Should not call getWorkTreeDiff
    expect(mockGetWorkTreeDiff).not.toHaveBeenCalled();
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
    const mockCreateMetricsTaskRunner = createMetricsTaskRunnerDouble().createMetricsTaskRunner;

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
      createMetricsTaskRunner: mockCreateMetricsTaskRunner,
      sortPaths: mockSortPaths,
      ...gitDeps,
    });

    // The enabled diff must be fetched and handed to metrics, not just echoed from the stub
    expect(mockGetWorkTreeDiff).toHaveBeenCalledWith(mockRootDir);
    expect(mockGetStagedDiff).toHaveBeenCalledWith(mockRootDir);
    expect(mockCalculateMetrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      mockConfig,
      { workTreeDiffContent: sampleDiff, stagedDiffContent: '' },
      undefined,
      expect.anything(),
    );

    // Check gitDiffTokenCount in the result
    expect(result.gitDiffTokenCount).toBe(15);
  });
});
