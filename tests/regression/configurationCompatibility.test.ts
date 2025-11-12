import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

describe.runIf(!isWindows)('Configuration Compatibility Tests', () => {
  let tempDir: string;
  const fixturesDir = path.join(__dirname, 'fixtures');
  const oldConfigsDir = path.join(fixturesDir, 'old-configs');
  const mixedConfigsDir = path.join(fixturesDir, 'mixed-configs');
  const testProjectsDir = path.join(fixturesDir, 'test-projects');

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-config-compat-test-'));
    // Reset environment variables
    delete process.env.REPOMIX_LINE_LIMIT;
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    await fs.rm(tempDir, { recursive: true, force: true });
    // Reset environment variables
    delete process.env.REPOMIX_LINE_LIMIT;
  });

  describe('Old Config File Compatibility', () => {
    test('should load config files without lineLimit property', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      // Verify old config loads correctly
      expect(fileConfig).toBeDefined();
      expect(fileConfig.output).toBeDefined();
      expect(fileConfig.output!.filePath).toBe('repomix-output.txt');
      expect(fileConfig.output!.headerText).toBe('Legacy configuration without lineLimit');
      expect(fileConfig.output!.lineLimit).toBeUndefined(); // Should not be present in old config
      expect(fileConfig.ignore).toBeDefined();
      expect(fileConfig.ignore!.useGitignore).toBe(true);
      expect(fileConfig.ignore!.useDefaultPatterns).toBe(true);
      expect(fileConfig.ignore!.customPatterns).toEqual(['*.log', '*.tmp']);
    });

    test('should merge old config with default values correctly', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {});

      // Verify old config values are preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Legacy configuration without lineLimit');
      expect(mergedConfig.output.lineLimit).toBeUndefined();
      expect(mergedConfig.ignore.useGitignore).toBe(true);
      expect(mergedConfig.ignore.useDefaultPatterns).toBe(true);
      expect(mergedConfig.ignore.customPatterns).toEqual(['*.log', '*.tmp']);

      // Verify default values are applied for missing properties
      expect(mergedConfig.output.style).toBe('xml'); // Default value
      expect(mergedConfig.output.fileSummary).toBe(true); // Default value
      expect(mergedConfig.output.directoryStructure).toBe(true); // Default value
      expect(mergedConfig.output.files).toBe(true); // Default value
    });

    test('should handle old config with all output formats', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      const outputStyles: RepomixOutputStyle[] = ['xml', 'markdown', 'plain', 'json'];

      for (const style of outputStyles) {
        const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
          output: { style },
        });

        expect(mergedConfig.output.style).toBe(style);
        expect(mergedConfig.output.lineLimit).toBeUndefined();
      }
    });
  });

  describe('Configuration Priority Order', () => {
    test('should respect CLI options over config file', async () => {
      const mixedConfigPath = path.join(mixedConfigsDir, 'repomix-with-line-limit.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, mixedConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
        output: {
          lineLimit: 25, // CLI override
          style: 'markdown' as RepomixOutputStyle,
        },
      });

      // CLI options should override config file
      expect(mergedConfig.output.lineLimit).toBe(25);
      expect(mergedConfig.output.style).toBe('markdown');

      // Other config file values should be preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Configuration with lineLimit');
    });

    test('should respect environment variable over config file', async () => {
      const mixedConfigPath = path.join(mixedConfigsDir, 'repomix-with-line-limit.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, mixedConfigPath);

      // Set environment variable
      process.env.REPOMIX_LINE_LIMIT = '75';

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {});

      // Environment variable should override config file
      expect(mergedConfig.output.lineLimit).toBe(75);

      // Other config file values should be preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Configuration with lineLimit');
    });

    test('should respect CLI options over environment variable', async () => {
      const mixedConfigPath = path.join(mixedConfigsDir, 'repomix-with-line-limit.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, mixedConfigPath);

      // Set environment variable
      process.env.REPOMIX_LINE_LIMIT = '75';

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
        output: {
          lineLimit: 25, // CLI override
        },
      });

      // CLI should override environment variable
      expect(mergedConfig.output.lineLimit).toBe(25);
    });

    test('should handle undefined lineLimit correctly', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {});

      // lineLimit should be undefined when not specified anywhere
      expect(mergedConfig.output.lineLimit).toBeUndefined();
    });

    test('should handle null environment variable correctly', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      // Set environment variable to empty string (should be treated as undefined)
      process.env.REPOMIX_LINE_LIMIT = '';

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {});

      // lineLimit should be undefined when environment variable is empty
      expect(mergedConfig.output.lineLimit).toBeUndefined();
    });
  });

  describe('Mixed Configuration Scenarios', () => {
    test('should handle config with lineLimit and other options', async () => {
      const mixedConfigPath = path.join(mixedConfigsDir, 'repomix-with-line-limit.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, mixedConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {});

      // Verify lineLimit is present
      expect(mergedConfig.output.lineLimit).toBe(50);

      // Verify other options are preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Configuration with lineLimit');
      expect(mergedConfig.output.removeComments).toBe(false);
      expect(mergedConfig.output.removeEmptyLines).toBe(false);
      expect(mergedConfig.output.topFilesLength).toBe(5);
      expect(mergedConfig.output.showLineNumbers).toBe(false);
    });

    test('should handle config file without lineLimit but with CLI line limit', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
        output: {
          lineLimit: 100,
        },
      });

      // CLI lineLimit should be applied
      expect(mergedConfig.output.lineLimit).toBe(100);

      // Old config values should be preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Legacy configuration without lineLimit');
    });

    test('should handle complex configuration merging', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
        output: {
          lineLimit: 30,
          style: 'json' as RepomixOutputStyle,
          removeComments: true,
        },
        ignore: {
          customPatterns: ['*.test.js', '*.spec.js'],
        },
      });

      // Verify all configurations are merged correctly
      expect(mergedConfig.output.lineLimit).toBe(30);
      expect(mergedConfig.output.style).toBe('json');
      expect(mergedConfig.output.removeComments).toBe(true);

      // Old config values should be preserved
      expect(mergedConfig.output.filePath).toBe('repomix-output.txt');
      expect(mergedConfig.output.headerText).toBe('Legacy configuration without lineLimit');
      expect(mergedConfig.output.removeEmptyLines).toBe(false);

      // Custom patterns should be merged
      expect(mergedConfig.ignore.customPatterns).toEqual(['*.log', '*.tmp', '*.test.js', '*.spec.js']);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate lineLimit values correctly', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      // Test valid lineLimit values
      const validLimits = [1, 10, 50, 100, 1000];

      for (const limit of validLimits) {
        const mergedConfig: RepomixConfigMerged = mergeConfigs(tempDir, fileConfig, {
          output: { lineLimit: limit },
        });

        expect(mergedConfig.output.lineLimit).toBe(limit);
      }
    });

    test('should handle invalid lineLimit values gracefully', async () => {
      const oldConfigPath = path.join(oldConfigsDir, 'repomix-v1-config.json');
      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, oldConfigPath);

      // Test that invalid values are handled by the validation schema
      // This test ensures the existing validation still works
      expect(() => {
        mergeConfigs(tempDir, fileConfig, {
          output: { lineLimit: -1 }, // Invalid: negative
        });
      }).toThrow();

      expect(() => {
        mergeConfigs(tempDir, fileConfig, {
          output: { lineLimit: 0 }, // Invalid: zero
        });
      }).toThrow();
    });
  });

  describe('Configuration Loading Order', () => {
    test('should search for config files in correct order', async () => {
      // Create multiple config files in temp directory
      await fs.writeFile(
        path.join(tempDir, 'repomix.config.ts'),
        'export default { output: { filePath: "ts-output.txt" } };',
      );
      await fs.writeFile(
        path.join(tempDir, 'repomix.config.js'),
        'module.exports = { output: { filePath: "js-output.txt" } };',
      );
      await fs.writeFile(path.join(tempDir, 'repomix.config.json'), '{ "output": { "filePath": "json-output.txt" } }');

      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, null);

      // Should load TypeScript config first (highest priority)
      expect(fileConfig.output?.filePath).toBe('ts-output.txt');
    });

    test('should fall back to next config type if first not found', async () => {
      // Create only JSON config
      await fs.writeFile(path.join(tempDir, 'repomix.config.json'), '{ "output": { "filePath": "json-output.txt" } }');

      const fileConfig: RepomixConfigFile = await loadFileConfig(tempDir, null);

      // Should load JSON config
      expect(fileConfig.output?.filePath).toBe('json-output.txt');
      expect(fileConfig.output?.lineLimit).toBeUndefined();
    });
  });
});
