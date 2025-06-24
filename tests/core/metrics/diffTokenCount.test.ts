import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { calculateMetrics } from '../../../src/core/metrics/calculateMetrics.js';

// Mock the TokenCounter
vi.mock('../../../src/core/metrics/TokenCounter.js', () => ({
  TokenCounter: vi.fn(),
}));

describe('Diff Token Count Calculation', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Setup TokenCounter mock
    vi.mocked(TokenCounter).mockReturnValue({
      countTokens: vi.fn((content) => {
        // Simple token counting for testing
        return content.split(/\s+/).length;
      }),
      free: vi.fn(),
      encoding: {
        encode: vi.fn(),
        free: vi.fn(),
      },
    } as unknown as TokenCounter);
  });

  test('should calculate diff token count when diffs are included', async () => {
    // Sample diffs
    const sampleDiff = `diff --git a/file1.js b/file1.js
index 123..456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,5 +1,5 @@
-old line of code
+new line of code
`;

    // Sample processed files
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    // Sample output
    const output = 'Generated output with sample content';

    // Sample config with diffs enabled
    const config: RepomixConfigMerged = {
      cwd: '/test',
      input: { maxFileSize: 1000000 },
      output: {
        filePath: 'output.txt',
        style: 'plain',
        parsableStyle: false,
        fileSummary: true,
        directoryStructure: true,
        files: true,
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        topFilesLength: 5,
        showLineNumbers: false,
        copyToClipboard: false,
        git: {
          sortByChanges: true,
          sortByChangesMaxCommits: 100,
          includeDiffs: true,
        },
      },
      include: [],
      forceInclude: [],
      ignore: {
        useGitignore: true,
        useDefaultPatterns: true,
        customPatterns: [],
      },
      security: {
        enableSecurityCheck: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    };

    // Mock dependency functions
    const mockCalculateAllFileMetrics = vi.fn().mockResolvedValue([
      {
        path: 'test.js',
        charCount: 20,
        tokenCount: 5,
      },
    ]);

    const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(15);

    const result = await calculateMetrics(
      processedFiles,
      output,
      vi.fn(), // Progress callback
      config,
      {
        workTreeDiffContent: sampleDiff,
        stagedDiffContent: '',
      },
      {
        calculateAllFileMetrics: mockCalculateAllFileMetrics,
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue([]),
        calculateOutputMetrics: mockCalculateOutputMetrics,
      },
    );

    // Check TokenCounter was instantiated with the correct encoding
    expect(TokenCounter).toHaveBeenCalledWith('o200k_base');

    // Check token counting was called with the diff content
    expect(result).toHaveProperty('gitDiffTokenCount');

    // Our mock counts words as tokens - the sample diff should have multiple tokens
    expect(result.gitDiffTokenCount).toBeGreaterThan(0);
  });

  test('should not calculate diff token count when diffs are disabled', async () => {
    // Sample processed files
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    // Sample output
    const output = 'Generated output without diffs';

    // Sample config with diffs disabled
    const config: RepomixConfigMerged = {
      cwd: '/test',
      input: { maxFileSize: 1000000 },
      output: {
        filePath: 'output.txt',
        style: 'plain',
        parsableStyle: false,
        fileSummary: true,
        directoryStructure: true,
        files: true,
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        topFilesLength: 5,
        showLineNumbers: false,
        copyToClipboard: false,
        git: {
          sortByChanges: true,
          sortByChangesMaxCommits: 100,
          includeDiffs: false,
        },
      },
      include: [],
      forceInclude: [],
      ignore: {
        useGitignore: true,
        useDefaultPatterns: true,
        customPatterns: [],
      },
      security: {
        enableSecurityCheck: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    };

    // Mock dependency functions
    const mockCalculateAllFileMetrics = vi.fn().mockResolvedValue([
      {
        path: 'test.js',
        charCount: 20,
        tokenCount: 5,
      },
    ]);

    const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(15);

    const result = await calculateMetrics(
      processedFiles,
      output,
      vi.fn(), // Progress callback
      config,
      undefined, // No diff content
      {
        calculateAllFileMetrics: mockCalculateAllFileMetrics,
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue([]),
        calculateOutputMetrics: mockCalculateOutputMetrics,
      },
    );

    // TokenCounter should not be called for diff content
    expect(result.gitDiffTokenCount).toBe(0);
  });

  test('should handle undefined diffContent gracefully', async () => {
    // Sample processed files
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    // Sample output
    const output = 'Generated output with diffs enabled but no content';

    // Sample config with diffs enabled but no content
    const config: RepomixConfigMerged = {
      cwd: '/test',
      input: { maxFileSize: 1000000 },
      output: {
        filePath: 'output.txt',
        style: 'plain',
        parsableStyle: false,
        fileSummary: true,
        directoryStructure: true,
        files: true,
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        topFilesLength: 5,
        showLineNumbers: false,
        copyToClipboard: false,
        git: {
          sortByChanges: true,
          sortByChangesMaxCommits: 100,
          includeDiffs: true,
          // No diffContent property
        },
      },
      include: [],
      forceInclude: [],
      ignore: {
        useGitignore: true,
        useDefaultPatterns: true,
        customPatterns: [],
      },
      security: {
        enableSecurityCheck: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    };

    // Mock dependency functions
    const mockCalculateAllFileMetrics = vi.fn().mockResolvedValue([
      {
        path: 'test.js',
        charCount: 20,
        tokenCount: 5,
      },
    ]);

    const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(15);

    const result = await calculateMetrics(
      processedFiles,
      output,
      vi.fn(), // Progress callback
      config,
      undefined, // No diff content
      {
        calculateAllFileMetrics: mockCalculateAllFileMetrics,
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue([]),
        calculateOutputMetrics: mockCalculateOutputMetrics,
      },
    );

    // gitDiffTokenCount should not be set
    expect(result.gitDiffTokenCount).toBe(0);
  });
});
