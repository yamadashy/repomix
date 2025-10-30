import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import { defaultConfig, type RepomixConfigCli, type RepomixConfigFile } from '../../src/config/configSchema.js';
import { getGlobalDirectory } from '../../src/config/globalDirectory.js';
import { RepomixConfigValidationError } from '../../src/shared/errorHandle.js';
import { logger } from '../../src/shared/logger.js';

vi.mock('node:fs/promises');
vi.mock('../../src/shared/logger', () => ({
  logger: {
    trace: vi.fn(),
    note: vi.fn(),
    log: vi.fn(),
  },
}));
vi.mock('../../src/config/globalDirectory', () => ({
  getGlobalDirectory: vi.fn(),
}));

describe('configLoad', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {};
  });

  describe('loadFileConfig', () => {
    test('should load and parse a valid local config file', async () => {
      const mockConfig = {
        output: { filePath: 'test-output.txt' },
        ignore: { useDefaultPatterns: true },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      const result = await loadFileConfig(process.cwd(), 'test-config.json');
      expect(result).toEqual(mockConfig);
    });

    test('should throw RepomixConfigValidationError for invalid config', async () => {
      const invalidConfig = {
        output: { filePath: 123, style: 'invalid' }, // Invalid filePath type and invalid style
        ignore: { useDefaultPatterns: 'not a boolean' }, // Invalid type
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json')).rejects.toThrow(RepomixConfigValidationError);
    });

    test('should load global config when local config is not found', async () => {
      const mockGlobalConfig = {
        output: { filePath: 'global-output.txt' },
        ignore: { useDefaultPatterns: false },
      };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      vi.mocked(fs.stat)
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.ts
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.mts
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.cts
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.js
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.mjs
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.cjs
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.json5
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.jsonc
        .mockRejectedValueOnce(new Error('File not found')) // Local repomix.config.json
        .mockRejectedValueOnce(new Error('File not found')) // Global repomix.config.ts
        .mockRejectedValueOnce(new Error('File not found')) // Global repomix.config.mts
        .mockRejectedValueOnce(new Error('File not found')) // Global repomix.config.cts
        .mockRejectedValueOnce(new Error('File not found')) // Global repomix.config.js
        .mockRejectedValueOnce(new Error('File not found')) // Global repomix.config.mjs
        .mockRejectedValueOnce(new Error('File not found')) // Global repomix.config.cjs
        .mockResolvedValueOnce({ isFile: () => true } as Stats); // Global repomix.config.json5
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockGlobalConfig));

      const result = await loadFileConfig(process.cwd(), null);
      expect(result).toEqual(mockGlobalConfig);
      expect(fs.readFile).toHaveBeenCalledWith(path.join('/global/repomix', 'repomix.config.json5'), 'utf-8');
    });

    test('should return an empty object if no config file is found', async () => {
      const loggerSpy = vi.spyOn(logger, 'log').mockImplementation(vi.fn());
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));

      const result = await loadFileConfig(process.cwd(), null);
      expect(result).toEqual({});

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('No custom config found'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('repomix.config.json5'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('repomix.config.jsonc'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('repomix.config.json'));
    });

    test('should throw an error for invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json')).rejects.toThrow('Invalid syntax');
    });

    test('should parse config file with comments', async () => {
      const configWithComments = `{
        // Output configuration
        "output": {
          "filePath": "test-output.txt"
        },
        /* Ignore configuration */
        "ignore": {
          "useGitignore": true // Use .gitignore file
        }
      }`;

      vi.mocked(fs.readFile).mockResolvedValue(configWithComments);
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      const result = await loadFileConfig(process.cwd(), 'test-config.json');
      expect(result).toEqual({
        output: { filePath: 'test-output.txt' },
        ignore: { useGitignore: true },
      });
    });

    test('should parse config file with JSON5 features', async () => {
      const configWithJSON5Features = `{
        // Output configuration
        output: {
          filePath: 'test-output.txt',
          style: 'plain',
        },
        /* Ignore configuration */
        ignore: {
          useGitignore: true, // Use .gitignore file
          customPatterns: [
            '*.log',
            '*.tmp',
            '*.temp', // Trailing comma
          ],
        },
      }`;

      vi.mocked(fs.readFile).mockResolvedValue(configWithJSON5Features);
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      const result = await loadFileConfig(process.cwd(), 'test-config.json');
      expect(result).toEqual({
        output: { filePath: 'test-output.txt', style: 'plain' },
        ignore: {
          useGitignore: true,
          customPatterns: ['*.log', '*.tmp', '*.temp'],
        },
      });
    });

    test('should load .jsonc config file with priority order', async () => {
      const mockConfig = {
        output: { filePath: 'jsonc-output.txt' },
        ignore: { useDefaultPatterns: true },
      };
      vi.mocked(fs.stat)
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.ts
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.mts
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.cts
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.js
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.mjs
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.cjs
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.json5
        .mockResolvedValueOnce({ isFile: () => true } as Stats); // repomix.config.jsonc
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadFileConfig(process.cwd(), null);
      expect(result).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalledWith(path.resolve(process.cwd(), 'repomix.config.jsonc'), 'utf-8');
    });

    test('should prioritize .json5 over .jsonc and .json', async () => {
      const mockConfig = {
        output: { filePath: 'json5-output.txt' },
        ignore: { useDefaultPatterns: true },
      };
      vi.mocked(fs.stat)
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.ts
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.mts
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.cts
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.js
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.mjs
        .mockRejectedValueOnce(new Error('File not found')) // repomix.config.cjs
        .mockResolvedValueOnce({ isFile: () => true } as Stats); // repomix.config.json5 exists
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadFileConfig(process.cwd(), null);
      expect(result).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalledWith(path.resolve(process.cwd(), 'repomix.config.json5'), 'utf-8');
      // Should not check for .jsonc or .json since .json5 was found
      expect(fs.stat).toHaveBeenCalledTimes(7);
    });

    test('should throw RepomixError when specific config file does not exist', async () => {
      const nonExistentConfigPath = 'non-existent-config.json';
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));

      await expect(loadFileConfig(process.cwd(), nonExistentConfigPath)).rejects.toThrow(
        `Config file not found at ${nonExistentConfigPath}`,
      );
    });

    test('should load specific project config when project name is provided', async () => {
      const mockConfig = {
        projects: {
          default: {
            output: { filePath: 'default-output.xml' },
          },
          ui: {
            output: { filePath: 'ui-output.xml' },
            ignore: { customPatterns: ['api/**'] },
          },
          api: {
            output: { filePath: 'api-output.xml' },
            ignore: { customPatterns: ['ui/**'] },
          },
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      const result = await loadFileConfig(process.cwd(), 'test-config.json', 'ui');
      expect(result).toEqual({
        output: { filePath: 'ui-output.xml' },
        ignore: { customPatterns: ['api/**'] },
      });
    });

    test('should load default project when no project name is provided and default exists', async () => {
      const mockConfig = {
        projects: {
          default: {
            output: { filePath: 'default-output.xml' },
            ignore: { customPatterns: [] },
          },
          ui: {
            output: { filePath: 'ui-output.xml' },
          },
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      const result = await loadFileConfig(process.cwd(), 'test-config.json');
      expect(result).toEqual({
        output: { filePath: 'default-output.xml' },
        ignore: { customPatterns: [] },
      });
    });

    test('should throw error when project name is provided but projects field does not exist', async () => {
      const mockConfig = {
        output: { filePath: 'output.xml' },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json', 'ui')).rejects.toThrow(
        'Project "ui" not found: Config file does not contain a "projects" field.',
      );
    });

    test('should throw error when specified project does not exist', async () => {
      const mockConfig = {
        projects: {
          default: {
            output: { filePath: 'default-output.xml' },
          },
          ui: {
            output: { filePath: 'ui-output.xml' },
          },
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json', 'api')).rejects.toThrow(
        'Project "api" not found in config file. Available projects: default, ui',
      );
    });

    test('should throw error when projects format is used but no default project and no project specified', async () => {
      const mockConfig = {
        projects: {
          ui: {
            output: { filePath: 'ui-output.xml' },
          },
          api: {
            output: { filePath: 'api-output.xml' },
          },
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json')).rejects.toThrow(
        'Config file uses "projects" format but no project was specified and no "default" project exists. Available projects: ui, api. Use --project <name> to specify a project.',
      );
    });

    test('should throw error when project name is provided but no config file exists', async () => {
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));

      await expect(loadFileConfig(process.cwd(), null, 'ui')).rejects.toThrow(
        'Cannot use --project option: No config file found. Please create a config file with a "projects" field.',
      );
    });
  });

  describe('mergeConfigs', () => {
    test('should correctly merge configs', () => {
      const fileConfig: RepomixConfigFile = {
        output: { filePath: 'file-output.txt' },
        ignore: { useDefaultPatterns: true, customPatterns: ['file-ignore'] },
      };
      const cliConfig: RepomixConfigCli = {
        output: { filePath: 'cli-output.txt' },
        ignore: { customPatterns: ['cli-ignore'] },
      };

      const result = mergeConfigs(process.cwd(), fileConfig, cliConfig);

      expect(result.output.filePath).toBe('cli-output.txt');
      expect(result.ignore.useDefaultPatterns).toBe(true);
      expect(result.ignore.customPatterns).toContain('file-ignore');
      expect(result.ignore.customPatterns).toContain('cli-ignore');
    });

    test('should throw RepomixConfigValidationError for invalid merged config', () => {
      const fileConfig: RepomixConfigFile = {
        output: { filePath: 'file-output.txt', style: 'plain' },
      };
      const cliConfig: RepomixConfigCli = {
        // @ts-expect-error
        output: { style: 'invalid' }, // Invalid style
      };

      expect(() => mergeConfigs(process.cwd(), fileConfig, cliConfig)).toThrow(RepomixConfigValidationError);
    });

    test('should merge nested git config correctly', () => {
      const fileConfig: RepomixConfigFile = {
        output: { git: { sortByChanges: false } },
      };
      const cliConfig: RepomixConfigCli = {
        output: { git: { includeDiffs: true } },
      };
      const merged = mergeConfigs(process.cwd(), fileConfig, cliConfig);

      // Both configs should be applied
      expect(merged.output.git.sortByChanges).toBe(false);
      expect(merged.output.git.includeDiffs).toBe(true);
      // Defaults should still be present
      expect(merged.output.git.sortByChangesMaxCommits).toBe(100);
    });

    test('should not mutate defaultConfig', () => {
      const originalFilePath = defaultConfig.output.filePath;
      const fileConfig: RepomixConfigFile = {
        output: { style: 'markdown' },
      };

      mergeConfigs(process.cwd(), fileConfig, {});

      // defaultConfig should remain unchanged
      expect(defaultConfig.output.filePath).toBe(originalFilePath);
    });

    test('should merge tokenCount config correctly', () => {
      const fileConfig: RepomixConfigFile = {
        tokenCount: { encoding: 'cl100k_base' },
      };
      const merged = mergeConfigs(process.cwd(), fileConfig, {});

      expect(merged.tokenCount.encoding).toBe('cl100k_base');
    });
  });
});
