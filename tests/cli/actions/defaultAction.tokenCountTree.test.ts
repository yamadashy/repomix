import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import * as cliReport from '../../../src/cli/cliReport.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoad from '../../../src/config/configLoad.js';
import * as packager from '../../../src/core/packager.js';
import * as processConcurrency from '../../../src/shared/processConcurrency.js';

vi.mock('../../../src/config/configLoad.js');
vi.mock('../../../src/core/packager.js');
vi.mock('../../../src/cli/cliReport.js');
vi.mock('../../../src/shared/processConcurrency.js');
vi.mock('../../../src/cli/actions/migrationAction.js', () => ({
  runMigrationAction: vi.fn(),
}));

describe('defaultAction with tokenCountTree', () => {
  const mockLoadFileConfig = configLoad.loadFileConfig as Mock;
  const mockMergeConfigs = configLoad.mergeConfigs as Mock;
  const mockPack = packager.pack as Mock;
  const mockReportResults = cliReport.reportResults as Mock;
  const mockInitTaskRunner = processConcurrency.initTaskRunner as Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockLoadFileConfig.mockResolvedValue({});
    mockMergeConfigs.mockReturnValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: false,
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

    // Mock initTaskRunner to return the config from mockMergeConfigs
    mockInitTaskRunner.mockImplementation(() => ({
      run: vi.fn().mockImplementation(async () => ({
        packResult: {
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
        },
        config: mockMergeConfigs.mock.results[mockMergeConfigs.mock.results.length - 1]?.value || {},
      })),
      cleanup: vi.fn().mockResolvedValue(undefined),
    }));
  });

  test('should display token count tree when --token-count-tree option is provided', async () => {
    const cliOptions: CliOptions = {
      tokenCountTree: true,
    };

    // Mock config to have tokenCountTree enabled
    mockMergeConfigs.mockReturnValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockReportResults).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        processedFiles: [
          { path: '/test/file1.js', content: 'content1' },
          { path: '/test/file2.js', content: 'content2' },
        ],
        fileTokenCounts: {},
      }),
      expect.objectContaining({
        output: expect.objectContaining({
          tokenCountTree: true,
        }),
      }),
      expect.any(Object),
    );
  });

  test('should not display token count tree when option is not provided', async () => {
    const cliOptions: CliOptions = {};

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockReportResults).toHaveBeenCalledWith(
      '/test',
      expect.any(Object),
      expect.objectContaining({
        output: expect.objectContaining({
          tokenCountTree: false,
        }),
      }),
      expect.any(Object),
    );
  });

  test('should display token count tree for multiple directories', async () => {
    const cliOptions: CliOptions = {
      tokenCountTree: true,
    };

    // Mock config to have tokenCountTree enabled
    mockMergeConfigs.mockReturnValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });

    await runDefaultAction(['src', 'tests'], '/project', cliOptions);

    expect(mockReportResults).toHaveBeenCalledWith(
      '/project',
      expect.any(Object),
      expect.objectContaining({
        output: expect.objectContaining({
          tokenCountTree: true,
        }),
      }),
      expect.any(Object),
    );
  });

  test('should pass threshold parameter when provided', async () => {
    const cliOptions: CliOptions = {
      tokenCountTree: 50,
    };

    // Mock config to have tokenCountTree enabled with threshold
    mockMergeConfigs.mockReturnValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: 50,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });

    await runDefaultAction(['.'], '/test', cliOptions);

    expect(mockReportResults).toHaveBeenCalledWith(
      '/test',
      expect.any(Object),
      expect.objectContaining({
        output: expect.objectContaining({
          tokenCountTree: 50,
        }),
      }),
      expect.any(Object),
    );
  });
});
