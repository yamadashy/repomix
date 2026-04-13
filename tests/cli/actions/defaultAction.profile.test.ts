import process from 'node:process';
import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { runDefaultAction } from '../../../src/cli/actions/defaultAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as fileStdin from '../../../src/core/file/fileStdin.js';
import * as packageJsonParser from '../../../src/core/file/packageJsonParse.js';
import * as packager from '../../../src/core/packager.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/core/file/packageJsonParse');
vi.mock('../../../src/core/file/fileStdin');
vi.mock('../../../src/shared/logger');
vi.mock('../../../src/cli/actions/migrationAction', () => ({
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
vi.mock('../../../src/cli/cliReport');

const mockConfig = createMockConfig({ cwd: process.cwd() });

const mockPackResult = {
  totalFiles: 1,
  totalCharacters: 100,
  totalTokens: 20,
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

const setupMocks = () => {
  vi.mocked(packageJsonParser.getVersion).mockResolvedValue('1.0.0');
  vi.mocked(configLoader.mergeConfigs).mockReturnValue(mockConfig);
  vi.mocked(fileStdin.readFilePathsFromStdin).mockResolvedValue({
    filePaths: [],
    emptyDirPaths: [],
  });
  vi.mocked(packager.pack).mockResolvedValue(mockPackResult);
};

describe('defaultAction --profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('applies named profile from file config', async () => {

    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({
      output: { style: 'xml' },
      profiles: {
        frontend: {
          include: ['src/components/**'],
          output: { filePath: 'repomix-frontend.xml', style: 'xml' },
        },
      },
    });

    const options: CliOptions = { profile: 'frontend' };
    await runDefaultAction(['.'], process.cwd(), options);

    // mergeConfigs should receive fileConfig with profile applied
    const mergeCallArgs = vi.mocked(configLoader.mergeConfigs).mock.calls[0];
    const mergedFileConfig = mergeCallArgs[1];
    expect(mergedFileConfig.include).toContain('src/components/**');
    expect(mergedFileConfig.output?.filePath).toBe('repomix-frontend.xml');
  });

  it('inherits base file config settings not overridden by profile', async () => {
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({
      output: { style: 'plain', fileSummary: false },
      profiles: {
        tests: {
          include: ['**/*.test.ts'],
        },
      },
    });

    const options: CliOptions = { profile: 'tests' };
    await runDefaultAction(['.'], process.cwd(), options);

    const mergeCallArgs = vi.mocked(configLoader.mergeConfigs).mock.calls[0];
    const mergedFileConfig = mergeCallArgs[1];
    // Profile include is applied
    expect(mergedFileConfig.include).toContain('**/*.test.ts');
    // Base file config output settings are preserved (profile did not override output)
    expect(mergedFileConfig.output?.style).toBe('plain');
    expect(mergedFileConfig.output?.fileSummary).toBe(false);
  });

  it('throws RepomixError when profile name does not exist', async () => {
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({
      profiles: {
        frontend: { include: ['src/**'] },
      },
    });

    const options: CliOptions = { profile: 'backend' };
    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow(
      'Profile "backend" not found.',
    );
  });

  it('error message lists available profiles when profile not found', async () => {
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({
      profiles: {
        frontend: { include: ['src/**'] },
        tests: { include: ['**/*.test.ts'] },
      },
    });

    const options: CliOptions = { profile: 'missing' };
    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow(
      'Available profiles: frontend, tests',
    );
  });

  it('throws helpful error when no profiles are defined', async () => {
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({});

    const options: CliOptions = { profile: 'any' };
    await expect(runDefaultAction(['.'], process.cwd(), options)).rejects.toThrow(
      'No profiles are defined in the config file.',
    );
  });

  it('merges customPatterns from profile and base file config', async () => {
    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({
      ignore: { customPatterns: ['*.log'] },
      profiles: {
        strict: {
          ignore: { customPatterns: ['*.tmp', '*.bak'] },
        },
      },
    });

    const options: CliOptions = { profile: 'strict' };
    await runDefaultAction(['.'], process.cwd(), options);

    const mergeCallArgs = vi.mocked(configLoader.mergeConfigs).mock.calls[0];
    const mergedFileConfig = mergeCallArgs[1];
    expect(mergedFileConfig.ignore?.customPatterns).toContain('*.log');
    expect(mergedFileConfig.ignore?.customPatterns).toContain('*.tmp');
    expect(mergedFileConfig.ignore?.customPatterns).toContain('*.bak');
  });
});
