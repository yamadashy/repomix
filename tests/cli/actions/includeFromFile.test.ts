import * as fs from 'node:fs/promises';
import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';
import { RepomixError } from '../../../src/shared/errorHandle.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:fs/promises');
vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/packageJsonParse');
vi.mock('../../../src/core/file/fileStdin');
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/cliReport');
vi.mock('../../../src/cli/actions/migrationAction', () => ({ runMigrationAction: vi.fn() }));
vi.mock('../../../src/cli/cliSpinner', () => {
  const MockSpinner = class {
    start = vi.fn();
    update = vi.fn();
    succeed = vi.fn();
    fail = vi.fn();
  };
  return { Spinner: MockSpinner };
});

const mockPackResult = {
  totalFiles: 1,
  totalCharacters: 100,
  totalTokens: 10,
  fileCharCounts: {},
  fileTokenCounts: {},
  suspiciousFilesResults: [],
  suspiciousGitDiffResults: [],
  suspiciousGitLogResults: [],
  processedFiles: [],
  safeFilePaths: [],
  gitDiffTokenCount: 0,
  gitLogTokenCount: 0,
  skippedFiles: [],
};

describe('--include-from-file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packageJsonParser.getVersion).mockResolvedValue('1.0.0');
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({});
    vi.mocked(configLoader.mergeConfigs).mockReturnValue(createMockConfig({ cwd: process.cwd() }));
    vi.mocked(packager.pack).mockResolvedValue(mockPackResult);
    vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({ filePaths: [], emptyDirPaths: [] });
  });

  it('should load patterns from file and merge with --include', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('src/**/*.ts\nlib/**/*.ts\n');

    const cliOptions: CliOptions = {
      includeFromFile: 'patterns.txt',
      include: 'README.md',
    };

    await runDefaultAction(['.'], process.cwd(), cliOptions);

    const cliConfig = vi.mocked(configLoader.mergeConfigs).mock.calls[0][2];
    expect(cliConfig.include).toContain('README.md');
    expect(cliConfig.include).toContain('src/**/*.ts');
    expect(cliConfig.include).toContain('lib/**/*.ts');
  });

  it('should strip comment lines and blank lines from the patterns file', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('# This is a comment\nsrc/**/*.ts\n\n  # another comment\nlib/**\n');

    await runDefaultAction(['.'], process.cwd(), { includeFromFile: 'patterns.txt' });

    const cliConfig = vi.mocked(configLoader.mergeConfigs).mock.calls[0][2];
    expect(cliConfig.include).toContain('src/**/*.ts');
    expect(cliConfig.include).toContain('lib/**');
    expect(cliConfig.include).not.toContain('# This is a comment');
    expect(cliConfig.include).not.toContain('# another comment');
  });

  it('should work with --include-from-file alone without --include', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('src/**\n');

    await runDefaultAction(['.'], process.cwd(), { includeFromFile: 'patterns.txt' });

    const cliConfig = vi.mocked(configLoader.mergeConfigs).mock.calls[0][2];
    expect(cliConfig.include).toContain('src/**');
  });

  it('should throw RepomixError when the patterns file does not exist', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

    await expect(runDefaultAction(['.'], process.cwd(), { includeFromFile: 'missing.txt' })).rejects.toThrow(
      RepomixError,
    );
    await expect(runDefaultAction(['.'], process.cwd(), { includeFromFile: 'missing.txt' })).rejects.toThrow(
      'Could not read include patterns file',
    );
  });
});
