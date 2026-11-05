import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import { createMockSpinner } from '../../testing/cliDoubles.js';

describe('defaultAction with tokenCountTree', () => {
  const mockBuildMergedConfig = vi.fn();
  const mockPack = vi.fn();
  const mockReportResults = vi.fn();
  const deps = {
    buildMergedConfig: mockBuildMergedConfig,
    readFilePathsFromStdin: vi.fn(),
    pack: mockPack,
    reportResults: mockReportResults,
    Spinner: createMockSpinner().Spinner,
  };

  beforeEach(() => {
    mockBuildMergedConfig.mockResolvedValue({
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
  });

  test('should display token count tree when --token-count-tree option is provided', async () => {
    const cliOptions: CliOptions = {
      tokenCountTree: true,
    };

    // Mock config to have tokenCountTree enabled
    mockBuildMergedConfig.mockResolvedValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });

    await runDefaultAction(['.'], '/test', cliOptions, undefined, deps);

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

    await runDefaultAction(['.'], '/test', cliOptions, undefined, deps);

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
    mockBuildMergedConfig.mockResolvedValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: true,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });

    await runDefaultAction(['src', 'tests'], '/project', cliOptions, undefined, deps);

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
    mockBuildMergedConfig.mockResolvedValue({
      output: {
        filePath: 'output.xml',
        topFilesLength: 5,
        tokenCountTree: 50,
      },
      tokenCount: {
        encoding: 'o200k_base',
      },
    });

    await runDefaultAction(['.'], '/test', cliOptions, undefined, deps);

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
