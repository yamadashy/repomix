import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import * as cliPrint from '../../../src/cli/cliPrint.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoad from '../../../src/config/configLoad.js';
import * as packager from '../../../src/core/packager.js';
import { summarizeTokenCounts } from '../../../src/core/tokenCount/saveTokenCounts.js';

vi.mock('../../../src/config/configLoad.js');
vi.mock('../../../src/core/packager.js');
vi.mock('../../../src/cli/cliPrint.js');
vi.mock('../../../src/core/tokenCount/saveTokenCounts.js');
vi.mock('../../../src/cli/actions/migrationAction.js', () => ({
  runMigrationAction: vi.fn(),
}));

describe('defaultAction with summarizeTokenCounts', () => {
  const mockLoadFileConfig = configLoad.loadFileConfig as Mock;
  const mockMergeConfigs = configLoad.mergeConfigs as Mock;
  const mockPack = packager.pack as Mock;
  const mockSummarizeTokenCounts = summarizeTokenCounts as Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockLoadFileConfig.mockResolvedValue({});
    mockMergeConfigs.mockReturnValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });
    mockPack.mockResolvedValue({
      totalFiles: 3,
      totalCharacters: 1000,
      totalTokens: 200,
      fileCharCounts: {},
      fileTokenCounts: {},
      gitDiffTokenCount: 0,
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
      processedFiles: [
        { path: '/test/file1.js', content: 'content1' },
        { path: '/test/file2.js', content: 'content2' },
      ],
      safeFilePaths: ['/test/file1.js', '/test/file2.js'],
    });
  });

  test('should summarize token counts when --summarize-token-counts option is provided', async () => {
    const cliOptions: CliOptions = {
      summarizeTokenCounts: true,
    };

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockSummarizeTokenCounts).toHaveBeenCalledWith(
      [
        { path: '/test/file1.js', content: 'content1' },
        { path: '/test/file2.js', content: 'content2' },
      ],
      'o200k_base',
      expect.any(Function),
      0,
    );
  });

  test('should not summarize token counts when option is not provided', async () => {
    const cliOptions: CliOptions = {};

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockSummarizeTokenCounts).not.toHaveBeenCalled();
  });

  test('should summarize token counts for multiple directories', async () => {
    const cliOptions: CliOptions = {
      summarizeTokenCounts: true,
    };

    await runDefaultAction(['src', 'tests'], '/project', cliOptions);

    expect(mockSummarizeTokenCounts).toHaveBeenCalledWith(expect.any(Array), 'o200k_base', expect.any(Function), 0);
  });

  test('should use custom token encoding if specified', async () => {
    const cliOptions: CliOptions = {
      summarizeTokenCounts: true,
      tokenCountEncoding: 'cl100k_base',
    };

    mockMergeConfigs.mockReturnValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
      },
      tokenCount: {
        encoding: 'cl100k_base',
      },
    });

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockSummarizeTokenCounts).toHaveBeenCalledWith(expect.any(Array), 'cl100k_base', expect.any(Function), 0);
  });

  test('should pass threshold parameter when provided', async () => {
    const cliOptions: CliOptions = {
      summarizeTokenCounts: '50',
    };

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockSummarizeTokenCounts).toHaveBeenCalledWith(expect.any(Array), 'o200k_base', expect.any(Function), 50);
  });
});
