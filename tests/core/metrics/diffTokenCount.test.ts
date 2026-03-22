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
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    const output = 'Generated output with sample content';

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

    const result = await calculateMetrics(
      processedFiles,
      output,
      vi.fn(),
      config,
      {
        workTreeDiffContent: 'diff --git a/file1.js b/file1.js',
        stagedDiffContent: '',
      },
      undefined,
      undefined,
      {
        calculateSelectiveFileMetrics: vi.fn().mockResolvedValue({ fileMetrics: [], totalFileTokens: 0 }),
        calculateOutputMetrics: vi.fn().mockResolvedValue(15),
        calculateGitDiffMetrics: vi.fn().mockResolvedValue(25),
        calculateGitLogMetrics: vi.fn().mockResolvedValue({ gitLogTokenCount: 0 }),
      },
    );

    expect(result).toHaveProperty('gitDiffTokenCount');
    expect(result.gitDiffTokenCount).toBe(25);
  });

  test('should not calculate diff token count when diffs are disabled', async () => {
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    const output = 'Generated output without diffs';

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

    const result = await calculateMetrics(processedFiles, output, vi.fn(), config, undefined, undefined, undefined, {
      calculateSelectiveFileMetrics: vi.fn().mockResolvedValue({ fileMetrics: [], totalFileTokens: 0 }),
      calculateOutputMetrics: vi.fn().mockResolvedValue(15),
      calculateGitDiffMetrics: vi.fn().mockResolvedValue(0),
      calculateGitLogMetrics: vi.fn().mockResolvedValue({ gitLogTokenCount: 0 }),
    });

    expect(result.gitDiffTokenCount).toBe(0);
  });

  test('should handle undefined diffContent gracefully', async () => {
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'console.log("test");',
      },
    ];

    const output = 'Generated output with diffs enabled but no content';

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

    const result = await calculateMetrics(processedFiles, output, vi.fn(), config, undefined, undefined, undefined, {
      calculateSelectiveFileMetrics: vi.fn().mockResolvedValue({ fileMetrics: [], totalFileTokens: 0 }),
      calculateOutputMetrics: vi.fn().mockResolvedValue(15),
      calculateGitDiffMetrics: vi.fn().mockResolvedValue(0),
      calculateGitLogMetrics: vi.fn().mockResolvedValue({ gitLogTokenCount: 0 }),
    });

    expect(result.gitDiffTokenCount).toBe(0);
  });
});
