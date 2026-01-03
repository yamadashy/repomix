import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { calculateMetrics } from '../../../src/core/metrics/calculateMetrics.js';
import { TokenCounter } from '../../../src/core/metrics/TokenCounter.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Mock the TokenCounter
vi.mock('../../../src/core/metrics/TokenCounter.js', () => ({
  TokenCounter: vi.fn(),
}));

describe('Diff Token Count Calculation', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Setup TokenCounter mock using mockImplementation for class constructor
    vi.mocked(TokenCounter).mockImplementation(
      () =>
        ({
          countTokens: vi.fn((content: string) => {
            // Simple token counting for testing
            return content.split(/\s+/).length;
          }),
          free: vi.fn(),
        }) as unknown as TokenCounter,
    );
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
    const config: RepomixConfigMerged = createMockConfig({
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
    });

    // Mock dependency functions
    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

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
      undefined,
      {
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue([]),
        calculateOutputMetrics: mockCalculateOutputMetrics,
        calculateGitDiffMetrics: vi.fn().mockResolvedValue(25),
        calculateGitLogMetrics: vi.fn().mockResolvedValue({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Check token counting was called with the diff content
    expect(result).toHaveProperty('gitDiffTokenCount');

    // Mock returns 25 tokens for git diff content
    expect(result.gitDiffTokenCount).toBe(25);
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
    const config: RepomixConfigMerged = createMockConfig({
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
    });

    // Mock dependency functions
    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

    const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(15);

    const result = await calculateMetrics(
      processedFiles,
      output,
      vi.fn(), // Progress callback
      config,
      undefined, // No diff content
      undefined,
      {
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue([]),
        calculateOutputMetrics: mockCalculateOutputMetrics,
        calculateGitDiffMetrics: vi.fn().mockResolvedValue(0),
        calculateGitLogMetrics: vi.fn().mockResolvedValue({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Git diff should return 0 when disabled
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
    const config: RepomixConfigMerged = createMockConfig({
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
    });

    // Mock dependency functions
    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

    const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(15);

    const result = await calculateMetrics(
      processedFiles,
      output,
      vi.fn(), // Progress callback
      config,
      undefined, // No diff content
      undefined,
      {
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue([]),
        calculateOutputMetrics: mockCalculateOutputMetrics,
        calculateGitDiffMetrics: vi.fn().mockResolvedValue(0),
        calculateGitLogMetrics: vi.fn().mockResolvedValue({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    // Git diff should return 0 when content is undefined
    expect(result.gitDiffTokenCount).toBe(0);
  });
});
