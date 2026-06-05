import { beforeEach, describe, expect, type Mock, type MockedFunction, test, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import * as configLoad from '../../../src/config/configLoad.js';
import * as packager from '../../../src/core/packager.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';

vi.mock('../../../src/config/configLoad.js');
vi.mock('../../../src/core/packager.js');
vi.mock('../../../src/cli/cliReport.js');
vi.mock('../../../src/cli/actions/migrationAction.js', () => ({
  runMigrationAction: vi.fn(),
}));

const mockSpinner = {
  start: vi.fn() as MockedFunction<() => void>,
  update: vi.fn() as MockedFunction<(message: string) => void>,
  succeed: vi.fn() as MockedFunction<(message: string) => void>,
  fail: vi.fn() as MockedFunction<(message: string) => void>,
};

vi.mock('../../../src/cli/cliSpinner', () => {
  const MockSpinner = class {
    start = mockSpinner.start;
    update = mockSpinner.update;
    succeed = mockSpinner.succeed;
    fail = mockSpinner.fail;
  };
  return { Spinner: MockSpinner };
});

describe('runDefaultAction token budget guard', () => {
  const mockLoadFileConfig = configLoad.loadFileConfig as Mock;
  const mockMergeConfigs = configLoad.mergeConfigs as Mock;
  const mockPack = packager.pack as Mock;

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
    vi.clearAllMocks();

    mockLoadFileConfig.mockResolvedValue({});
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
    mockMergeConfigs.mockReturnValue(buildConfig(500));

    await expect(runDefaultAction(['.'], '/test', { tokenBudget: 500 })).resolves.toBeDefined();
  });

  test('succeeds when no budget is configured', async () => {
    mockMergeConfigs.mockReturnValue(buildConfig(undefined));

    await expect(runDefaultAction(['.'], '/test', {})).resolves.toBeDefined();
  });

  test('throws when packed tokens exceed budget', async () => {
    mockMergeConfigs.mockReturnValue(buildConfig(100));

    await expect(runDefaultAction(['.'], '/test', { tokenBudget: 100 })).rejects.toThrow(RepomixError);
  });

  test('does not throw when the check is deferred, even if over budget', async () => {
    // Remote runs set deferTokenBudgetCheck so they can copy the output out of
    // the temp dir before enforcing the budget themselves.
    mockMergeConfigs.mockReturnValue(buildConfig(100));

    await expect(
      runDefaultAction(['.'], '/test', { tokenBudget: 100, deferTokenBudgetCheck: true }),
    ).resolves.toBeDefined();
  });
});
