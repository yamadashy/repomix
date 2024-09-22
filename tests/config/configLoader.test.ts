import type { Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoader.js';
import type { RepopackConfigCli, RepopackConfigFile } from '../../src/config/configSchema.js';
import { getGlobalDirectory } from '../../src/config/globalDirectory.js';
import { RepopackConfigValidationError } from '../../src/shared/errorHandler.js';
import { logger } from '../../src/shared/logger.js';

vi.mock('node:fs/promises');
vi.mock('../../src/shared/logger', () => ({
  logger: {
    trace: vi.fn(),
    note: vi.fn(),
  },
}));
vi.mock('../../src/config/globalDirectory', () => ({
  getGlobalDirectory: vi.fn(),
}));

describe('configLoader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {};
  });

  describe('loadFileConfig', () => {
    test('should load and parse a valid local config file', async () => {
      const mockConfig = {
        output: { filePath: 'test-output.txt', style: 'plain' },
        ignore: { useDefaultPatterns: true },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      const result = await loadFileConfig(process.cwd(), 'test-config.json');
      expect(result).toEqual(mockConfig);
    });

    test('should throw RepopackConfigValidationError for invalid config', async () => {
      const invalidConfig = {
        output: { filePath: 123, style: 'invalid' }, // Invalid filePath type and invalid style
        ignore: { useDefaultPatterns: 'not a boolean' }, // Invalid type
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidConfig));
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json')).rejects.toThrow(RepopackConfigValidationError);
    });

    test('should load global config when local config is not found', async () => {
      const mockGlobalConfig = {
        output: { filePath: 'global-output.txt', style: 'xml' },
        ignore: { useDefaultPatterns: false },
      };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repopack');
      vi.mocked(fs.stat)
        .mockRejectedValueOnce(new Error('File not found')) // Local config
        .mockResolvedValueOnce({ isFile: () => true } as Stats); // Global config
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockGlobalConfig));

      const result = await loadFileConfig(process.cwd(), null);
      expect(result).toEqual(mockGlobalConfig);
      expect(fs.readFile).toHaveBeenCalledWith(path.join('/global/repopack', 'repopack.config.json'), 'utf-8');
    });

    test('should return an empty object if no config file is found', async () => {
      const loggerSpy = vi.spyOn(logger, 'note').mockImplementation(vi.fn());
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repopack');
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));

      const result = await loadFileConfig(process.cwd(), null);
      expect(result).toEqual({});

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('No custom config found'));
    });

    test('should throw an error for invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as Stats);

      await expect(loadFileConfig(process.cwd(), 'test-config.json')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('mergeConfigs', () => {
    test('should correctly merge configs', () => {
      const fileConfig: RepopackConfigFile = {
        output: { filePath: 'file-output.txt', style: 'plain' },
        ignore: { useDefaultPatterns: true, customPatterns: ['file-ignore'] },
      };
      const cliConfig: RepopackConfigCli = {
        output: { filePath: 'cli-output.txt', style: 'xml' },
        ignore: { customPatterns: ['cli-ignore'] },
      };

      const result = mergeConfigs(process.cwd(), fileConfig, cliConfig);

      expect(result.output.filePath).toBe('cli-output.txt');
      expect(result.output.style).toBe('xml');
      expect(result.ignore.useDefaultPatterns).toBe(true);
      expect(result.ignore.customPatterns).toContain('file-ignore');
      expect(result.ignore.customPatterns).toContain('cli-ignore');
    });

    test('should throw RepopackConfigValidationError for invalid merged config', () => {
      const fileConfig: RepopackConfigFile = {
        output: { filePath: 'file-output.txt', style: 'plain' },
      };
      const cliConfig: RepopackConfigCli = {
        // @ts-ignore
        output: { style: 'invalid' }, // Invalid style
      };

      expect(() => mergeConfigs(process.cwd(), fileConfig, cliConfig)).toThrow(RepopackConfigValidationError);
    });
  });
});
