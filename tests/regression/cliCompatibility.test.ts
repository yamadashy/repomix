import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../src/cli/cliRun.js';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import type { RepomixConfigFile, RepomixConfigMerged, RepomixOutputStyle } from '../../src/config/configSchema.js';
import { collectFiles } from '../../src/core/file/fileCollect.js';
import { searchFiles } from '../../src/core/file/fileSearch.js';
import type { ProcessedFile } from '../../src/core/file/fileTypes.js';
import type { FileCollectTask } from '../../src/core/file/workers/fileCollectWorker.js';
import fileCollectWorker from '../../src/core/file/workers/fileCollectWorker.js';
import fileProcessWorker from '../../src/core/file/workers/fileProcessWorker.js';
import type { GitDiffResult } from '../../src/core/git/gitDiffHandle.js';
import { generateOutput } from '../../src/core/output/outputGenerate.js';
import { copyToClipboardIfEnabled } from '../../src/core/packager/copyToClipboardIfEnabled.js';
import { writeOutputToDisk } from '../../src/core/packager/writeOutputToDisk.js';
import { pack } from '../../src/core/packager.js';
import { filterOutUntrustedFiles } from '../../src/core/security/filterOutUntrustedFiles.js';
import { validateFileSafety } from '../../src/core/security/validateFileSafety.js';
import type { WorkerOptions } from '../../src/shared/processConcurrency.js';
import { isWindows } from '../testing/testUtils.js';

const mockCollectFileInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await fileCollectWorker(task as FileCollectTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe.runIf(!isWindows)('CLI Compatibility Tests', () => {
  let tempDir: string;
  const fixturesDir = path.join(__dirname, 'fixtures');
  const oldConfigsDir = path.join(fixturesDir, 'old-configs');
  const mixedConfigsDir = path.join(fixturesDir, 'mixed-configs');
  const testProjectsDir = path.join(fixturesDir, 'test-projects');

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-cli-compat-test-'));
    // Reset environment variables
    delete process.env.REPOMIX_LINE_LIMIT;
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
    // Reset environment variables
    delete process.env.REPOMIX_LINE_LIMIT;
  });

  describe('Existing CLI Options Compatibility', () => {
    test('should handle all existing CLI options without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Test with various existing CLI options
      const cliOptions = {
        output: 'test-output.txt',
        style: 'markdown' as RepomixOutputStyle,
        verbose: true,
        headerText: 'Test header',
        removeComments: true,
        removeEmptyLines: true,
        showLineNumbers: true,
        topFilesLength: 10,
        gitignore: false,
        defaultPatterns: false,
        securityCheck: false,
      };

      // Mock the default action to capture the config
      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            filePath: 'test-output.txt',
            style: 'markdown',
            headerText: 'Test header',
            removeComments: true,
            removeEmptyLines: true,
            showLineNumbers: true,
            topFilesLength: 10,
          }),
          ignore: expect.objectContaining({
            useGitignore: false,
            useDefaultPatterns: false,
          }),
          security: expect.objectContaining({
            enableSecurityCheck: false,
          }),
        }),
      );

      // Verify lineLimit is not set
      const callArgs = mockRunDefaultAction.mock.calls[0][2] as any;
      expect(callArgs.output?.lineLimit).toBeUndefined();
    });

    test('should handle stdout option without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        stdout: true,
        style: 'plain' as RepomixOutputStyle,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            stdout: true,
            style: 'plain',
          }),
        }),
      );

      // Verify lineLimit is not set
      const callArgs = mockRunDefaultAction.mock.calls[0][2] as any;
      expect(callArgs.output?.lineLimit).toBeUndefined();
    });

    test('should handle include and ignore patterns without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        include: '*.js,*.json',
        ignore: '*.md',
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          include: ['*.js', '*.json'],
          ignore: expect.objectContaining({
            customPatterns: ['*.md'],
          }),
        }),
      );

      // Verify lineLimit is not set
      const callArgs = mockRunDefaultAction.mock.calls[0][2] as any;
      expect(callArgs.output?.lineLimit).toBeUndefined();
    });
  });

  describe('Line Limit CLI Option', () => {
    test('should handle --line option correctly', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        line: 25,
        style: 'xml' as RepomixOutputStyle,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            lineLimit: 25,
            style: 'xml',
          }),
        }),
      );
    });

    test('should handle --line option with other options', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        line: 50,
        output: 'test-output.txt',
        style: 'markdown' as RepomixOutputStyle,
        verbose: true,
        removeComments: true,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            lineLimit: 50,
            filePath: 'test-output.txt',
            style: 'markdown',
            removeComments: true,
          }),
        }),
      );
    });

    test('should handle --line option with old config file', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');

      const cliOptions = {
        config: oldConfigPath,
        line: 75,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            lineLimit: 75, // CLI should override config
            filePath: 'repomix-output.txt', // From old config
            headerText: 'Legacy configuration without lineLimit', // From old config
          }),
        }),
      );
    });
  });

  describe('Environment Variable Integration', () => {
    test('should read REPOMIX_LINE_LIMIT environment variable', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Set environment variable
      process.env.REPOMIX_LINE_LIMIT = '100';

      const cliOptions = {
        style: 'xml' as RepomixOutputStyle,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            lineLimit: 100,
            style: 'xml',
          }),
        }),
      );
    });

    test('should prioritize CLI over environment variable', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Set environment variable
      process.env.REPOMIX_LINE_LIMIT = '100';

      const cliOptions = {
        line: 25, // CLI should override env
        style: 'xml' as RepomixOutputStyle,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            lineLimit: 25, // CLI should win
            style: 'xml',
          }),
        }),
      );
    });

    test('should handle empty environment variable', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Set environment variable to empty string
      process.env.REPOMIX_LINE_LIMIT = '';

      const cliOptions = {
        style: 'xml' as RepomixOutputStyle,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            lineLimit: undefined, // Empty env var should be treated as undefined
            style: 'xml',
          }),
        }),
      );
    });
  });

  describe('Help and Version Compatibility', () => {
    test('should display help text correctly', async () => {
      const { runVersionAction } = await import('../../src/cli/actions/versionAction.js');
      const mockRunVersionAction = vi.mocked(runVersionAction);

      const cliOptions = {
        help: true,
      };

      await runCli(['.'], tempDir, cliOptions);

      // Help should not trigger default action
      expect(mockRunVersionAction).not.toHaveBeenCalled();
    });

    test('should display version correctly', async () => {
      const { runVersionAction } = await import('../../src/cli/actions/versionAction.js');
      const mockRunVersionAction = vi.mocked(runVersionAction);

      const cliOptions = {
        version: true,
      };

      await runCli(['.'], tempDir, cliOptions);

      expect(mockRunVersionAction).toHaveBeenCalled();
    });
  });

  describe('Error Handling Compatibility', () => {
    test('should handle invalid line limit values gracefully', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        line: -1, // Invalid negative value
      };

      // Should handle validation error gracefully
      await expect(runCli([testProjectDir], tempDir, cliOptions)).rejects.toThrow();
    });

    test('should handle non-numeric line limit values gracefully', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      // Simulate invalid CLI input by setting environment variable to non-numeric
      process.env.REPOMIX_LINE_LIMIT = 'invalid';

      const cliOptions = {
        style: 'xml' as RepomixOutputStyle,
      };

      // Should handle validation error gracefully
      await expect(runCli([testProjectDir], tempDir, cliOptions)).rejects.toThrow();
    });
  });

  describe('Complex CLI Scenarios', () => {
    test('should handle multiple input directories without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        style: 'plain' as RepomixOutputStyle,
        verbose: true,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir, testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir, testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            style: 'plain',
          }),
        }),
      );

      // Verify lineLimit is not set
      const callArgs = mockRunDefaultAction.mock.calls[0][2] as any;
      expect(callArgs.output?.lineLimit).toBeUndefined();
    });

    test('should handle all output formats with and without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const outputStyles: RepomixOutputStyle[] = ['xml', 'markdown', 'plain', 'json'];

      for (const style of outputStyles) {
        const cliOptions = {
          style,
          output: `test-output.${style === 'xml' ? 'xml' : style === 'markdown' ? 'md' : style === 'plain' ? 'txt' : 'json'}`,
        };

        const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
        const mockRunDefaultAction = vi.mocked(runDefaultAction);

        await runCli([testProjectDir], tempDir, cliOptions);

        expect(mockRunDefaultAction).toHaveBeenCalledWith(
          [testProjectDir],
          tempDir,
          expect.objectContaining({
            output: expect.objectContaining({
              style,
              lineLimit: undefined, // Should not be set when not specified
            }),
          }),
        );
      }
    });

    test('should handle git-related options without line limiting', async () => {
      const testProjectDir = path.join(testProjectsDir, 'simple-js-project');

      const cliOptions = {
        sortByChanges: true,
        sortByChangesMaxCommits: 50,
        includeDiffs: true,
        includeLogs: true,
        includeLogsCount: 25,
      };

      const { runDefaultAction } = await import('../../src/cli/actions/defaultAction.js');
      const mockRunDefaultAction = vi.mocked(runDefaultAction);

      await runCli([testProjectDir], tempDir, cliOptions);

      expect(mockRunDefaultAction).toHaveBeenCalledWith(
        [testProjectDir],
        tempDir,
        expect.objectContaining({
          output: expect.objectContaining({
            git: expect.objectContaining({
              sortByChanges: true,
              sortByChangesMaxCommits: 50,
              includeDiffs: true,
              includeLogs: true,
              includeLogsCount: 25,
            }),
            lineLimit: undefined, // Should not be set when not specified
          }),
        }),
      );
    });
  });
});
