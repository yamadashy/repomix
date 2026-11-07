import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { createMockSpinner } from '../../testing/cliDoubles.js';

describe('runDefaultAction token budget guard', () => {
  const mockBuildMergedConfig = vi.fn();
  const mockPack = vi.fn();
  const deps = {
    buildMergedConfig: mockBuildMergedConfig,
    readFilePathsFromStdin: vi.fn(),
    pack: mockPack,
    reportResults: vi.fn(),
    Spinner: createMockSpinner().Spinner,
  };

  const buildConfig = (tokenBudget?: number) => ({
    output: {
      filePath: 'output.xml',
      topFilesLength: 5,
      tokenCountTree: false,
      tokenBudget,
    },
    tokenCount: {
      encoding: 'o200k_base',
    },
  });

  beforeEach(() => {
    mockPack.mockResolvedValue({
      totalFiles: 3,
      totalCharacters: 1000,
      totalTokens: 200,
      fileCharCounts: {},
      fileTokenCounts: {},
      gitDiffTokenCount: 0,
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
      processedFiles: [],
      safeFilePaths: [],
    });
  });

  test('succeeds when packed tokens are within budget', async () => {
    mockBuildMergedConfig.mockResolvedValue(buildConfig(500));

    await expect(runDefaultAction(['.'], '/test', { tokenBudget: 500 }, undefined, deps)).resolves.toEqual({
      packResult: expect.objectContaining({ totalTokens: 200 }),
      config: buildConfig(500),
    });
  });

  test('succeeds when no budget is configured', async () => {
    mockBuildMergedConfig.mockResolvedValue(buildConfig(undefined));

    await expect(runDefaultAction(['.'], '/test', {}, undefined, deps)).resolves.toEqual({
      packResult: expect.objectContaining({ totalTokens: 200 }),
      config: buildConfig(undefined),
    });
  });

  test('throws when packed tokens exceed budget', async () => {
    mockBuildMergedConfig.mockResolvedValue(buildConfig(100));

    await expect(runDefaultAction(['.'], '/test', { tokenBudget: 100 }, undefined, deps)).rejects.toThrow(RepomixError);
  });

  test('does not throw when the check is deferred, even if over budget', async () => {
    // Remote runs set deferTokenBudgetCheck so they can copy the output out of
    // the temp dir before enforcing the budget themselves.
    mockBuildMergedConfig.mockResolvedValue(buildConfig(100));

    await expect(
      runDefaultAction(['.'], '/test', { tokenBudget: 100, deferTokenBudgetCheck: true }, undefined, deps),
    ).resolves.toEqual({
      packResult: expect.objectContaining({ totalTokens: 200 }),
      config: buildConfig(100),
    });
  });
});
