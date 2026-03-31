import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { loadFileConfig, mergeConfigs } from '../../src/config/configLoad.js';
import { defaultConfig, type RepomixConfigCli, type RepomixConfigFile } from '../../src/config/configSchema.js';
import { getGlobalDirectory } from '../../src/config/globalDirectory.js';
import { RepomixConfigValidationError } from '../../src/shared/errorHandle.js';
import { logger } from '../../src/shared/logger.js';

vi.mock('../../src/shared/logger', () => ({
  logger: {
    trace: vi.fn(),
    note: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  },
}));
vi.mock('../../src/config/globalDirectory', () => ({
  getGlobalDirectory: vi.fn(),
}));

// Helper to create a mock c12 loadConfig function
// Mirrors real c12 behavior: `configFile` is always a truthy resolved path,
// `_configFile` is only set when an actual file was loaded from disk.
const createMockC12Load = (behavior: {
  localConfig?: Record<string, unknown> | null;
  localConfigFile?: string;
  globalConfig?: Record<string, unknown> | null;
  globalConfigFile?: string;
  explicitConfig?: Record<string, unknown> | null;
  explicitConfigFile?: string;
  throwError?: Error;
}) => {
  return vi.fn().mockImplementation((options: { cwd: string; configFile: string }) => {
    if (behavior.throwError) {
      throw behavior.throwError;
    }

    const globalDir = vi.mocked(getGlobalDirectory).getMockImplementation()?.() ?? '/global/repomix';
    const defaultConfigFile = path.resolve(options.cwd, options.configFile);

    // Check if this is an explicit config file load (configFile is not the default pattern)
    if (options.configFile !== 'repomix.config') {
      if (behavior.explicitConfig != null) {
        const resolvedFile = behavior.explicitConfigFile ?? path.resolve(options.cwd, options.configFile);
        return {
          config: behavior.explicitConfig,
          configFile: resolvedFile,
          _configFile: resolvedFile,
          layers: [],
          cwd: options.cwd,
        };
      }
      return { config: {}, configFile: defaultConfigFile, _configFile: undefined, layers: [], cwd: options.cwd };
    }

    // For auto-discovery, check if this is a global or local call based on cwd
    if (options.cwd === globalDir) {
      if (behavior.globalConfig != null) {
        const resolvedFile = behavior.globalConfigFile ?? path.join(globalDir, 'repomix.config.json');
        return {
          config: behavior.globalConfig,
          configFile: resolvedFile,
          _configFile: resolvedFile,
          layers: [],
          cwd: options.cwd,
        };
      }
      return { config: {}, configFile: defaultConfigFile, _configFile: undefined, layers: [], cwd: options.cwd };
    }

    // Local config
    if (behavior.localConfig != null) {
      const resolvedFile = behavior.localConfigFile ?? path.resolve(options.cwd, 'repomix.config.json');
      return {
        config: behavior.localConfig,
        configFile: resolvedFile,
        _configFile: resolvedFile,
        layers: [],
        cwd: options.cwd,
      };
    }
    return { config: {}, configFile: defaultConfigFile, _configFile: undefined, layers: [], cwd: options.cwd };
  });
};

describe('configLoad', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {};
  });

  describe('loadFileConfig', () => {
    test('should load and parse a valid local config file via explicit path', async () => {
      const mockConfig = {
        output: { filePath: 'test-output.txt' },
        ignore: { useDefaultPatterns: true },
      };
      const mockC12Load = createMockC12Load({
        explicitConfig: mockConfig,
        explicitConfigFile: path.resolve(process.cwd(), 'test-config.json'),
      });

      const result = await loadFileConfig(process.cwd(), 'test-config.json', {}, { c12Load: mockC12Load });
      expect(result).toEqual(mockConfig);
    });

    test('should throw RepomixConfigValidationError for invalid config', async () => {
      const invalidConfig = {
        output: { filePath: 123, style: 'invalid' },
        ignore: { useDefaultPatterns: 'not a boolean' },
      };
      const mockC12Load = createMockC12Load({
        explicitConfig: invalidConfig,
        explicitConfigFile: path.resolve(process.cwd(), 'test-config.json'),
      });

      await expect(loadFileConfig(process.cwd(), 'test-config.json', {}, { c12Load: mockC12Load })).rejects.toThrow(
        RepomixConfigValidationError,
      );
    });

    test('should load global config when local config is not found', async () => {
      const mockGlobalConfig = {
        output: { filePath: 'global-output.txt' },
        ignore: { useDefaultPatterns: false },
      };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig: null,
        globalConfig: mockGlobalConfig,
        globalConfigFile: path.join('/global/repomix', 'repomix.config.json5'),
      });

      const result = await loadFileConfig(process.cwd(), null, {}, { c12Load: mockC12Load });
      expect(result).toEqual(mockGlobalConfig);
    });

    test('should return an empty object if no config file is found', async () => {
      const loggerSpy = vi.spyOn(logger, 'log').mockImplementation(vi.fn());
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig: null,
        globalConfig: null,
      });

      const result = await loadFileConfig(process.cwd(), null, {}, { c12Load: mockC12Load });
      expect(result).toEqual({});

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('No custom config found'));
    });

    test('should throw an error when c12 throws for explicit config', async () => {
      const mockC12Load = vi.fn().mockImplementation(() => {
        throw new SyntaxError('Unexpected token');
      });

      await expect(loadFileConfig(process.cwd(), 'test-config.json', {}, { c12Load: mockC12Load })).rejects.toThrow(
        'Error loading config',
      );
    });

    test('should auto-discover local config via c12 discovery', async () => {
      const mockConfig = {
        output: { filePath: 'auto-output.txt' },
        ignore: { useDefaultPatterns: true },
      };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig: mockConfig,
        localConfigFile: path.resolve(process.cwd(), 'repomix.config.json'),
      });

      const result = await loadFileConfig(process.cwd(), null, {}, { c12Load: mockC12Load });
      expect(result).toEqual(mockConfig);
    });

    test('should discover config in .config/ directory', async () => {
      const mockConfig = {
        output: { filePath: 'dotconfig-output.txt' },
      };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig: mockConfig,
        localConfigFile: path.resolve(process.cwd(), '.config/repomix.json'),
      });

      const result = await loadFileConfig(process.cwd(), null, {}, { c12Load: mockC12Load });
      expect(result).toEqual(mockConfig);
    });

    test('should throw RepomixError when specific config file does not exist', async () => {
      const nonExistentConfigPath = 'non-existent-config.json';
      const mockC12Load = createMockC12Load({
        explicitConfig: null,
      });

      await expect(loadFileConfig(process.cwd(), nonExistentConfigPath, {}, { c12Load: mockC12Load })).rejects.toThrow(
        `Config file not found at ${nonExistentConfigPath}`,
      );
    });

    test('should handle general errors when loading config', async () => {
      const mockC12Load = vi.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(loadFileConfig(process.cwd(), 'test-config.json', {}, { c12Load: mockC12Load })).rejects.toThrow(
        'Error loading config',
      );
    });

    test('should skip local config auto-detection when skipLocalConfig is true', async () => {
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig: null,
        globalConfig: null,
      });

      const result = await loadFileConfig('/project/repo', null, { skipLocalConfig: true }, { c12Load: mockC12Load });
      expect(result).toEqual({});
    });

    test('should still load global config when skipLocalConfig is true', async () => {
      const mockGlobalConfig = { output: { style: 'markdown' } };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig: null,
        globalConfig: mockGlobalConfig,
        globalConfigFile: path.join('/global/repomix', 'repomix.config.json'),
      });

      const result = await loadFileConfig('/project/repo', null, { skipLocalConfig: true }, { c12Load: mockC12Load });
      expect(result).toEqual(mockGlobalConfig);
    });

    test('should not call c12Load for local config when skipLocalConfig is true', async () => {
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        globalConfig: null,
      });

      await loadFileConfig('/tmp/repomix-clone', null, { skipLocalConfig: true }, { c12Load: mockC12Load });

      // c12Load should only be called for global, not for the local cwd
      for (const call of mockC12Load.mock.calls) {
        const opts = call[0] as Record<string, unknown>;
        expect(opts.cwd).not.toBe('/tmp/repomix-clone');
      }

      // Should log a security note about skipping
      expect(logger.note).toHaveBeenCalledWith(expect.stringContaining('Skipping local config'));
      expect(logger.note).toHaveBeenCalledWith(expect.stringContaining('--remote-trust-config'));
    });

    test('should still respect --config flag even when skipLocalConfig is true', async () => {
      const mockConfig = { output: { filePath: 'custom-output.xml' } };
      const mockC12Load = createMockC12Load({
        explicitConfig: mockConfig,
        explicitConfigFile: '/home/user/my-config.json',
      });

      const result = await loadFileConfig(
        '/tmp/repomix-clone',
        '/home/user/my-config.json',
        { skipLocalConfig: true },
        { c12Load: mockC12Load },
      );
      expect(result).toEqual(mockConfig);
    });

    test('should prioritize local config over global config', async () => {
      const localConfig = { output: { filePath: 'local-output.txt' } };
      const globalConfig = { output: { filePath: 'global-output.txt' } };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        localConfig,
        localConfigFile: path.resolve(process.cwd(), 'repomix.config.json'),
        globalConfig,
        globalConfigFile: path.join('/global/repomix', 'repomix.config.json'),
      });

      const result = await loadFileConfig(process.cwd(), null, {}, { c12Load: mockC12Load });

      // Local config should win; global should not even be checked
      expect(result).toEqual(localConfig);
      // c12Load should be called once for local discovery only
      expect(mockC12Load).toHaveBeenCalledTimes(1);
      expect(mockC12Load).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: process.cwd(), configFile: 'repomix.config' }),
      );
    });

    test('should use explicit --config over local auto-discovery', async () => {
      const explicitConfig = { output: { filePath: 'explicit-output.txt' } };
      const localConfig = { output: { filePath: 'local-output.txt' } };
      vi.mocked(getGlobalDirectory).mockReturnValue('/global/repomix');
      const mockC12Load = createMockC12Load({
        explicitConfig,
        explicitConfigFile: path.resolve(process.cwd(), 'custom.json'),
        localConfig,
      });

      const result = await loadFileConfig(process.cwd(), 'custom.json', {}, { c12Load: mockC12Load });

      // Explicit config should win
      expect(result).toEqual(explicitConfig);
      // c12Load should be called once for the explicit file only
      expect(mockC12Load).toHaveBeenCalledTimes(1);
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

    test('should map default filename to style when only style is provided via CLI', () => {
      const merged = mergeConfigs(process.cwd(), {}, { output: { style: 'markdown' } });
      expect(merged.output.filePath).toBe('repomix-output.md');
      expect(merged.output.style).toBe('markdown');
    });

    test('should keep explicit CLI output filePath even when style is provided', () => {
      const merged = mergeConfigs(process.cwd(), {}, { output: { style: 'markdown', filePath: 'custom-output.any' } });
      expect(merged.output.filePath).toBe('custom-output.any');
      expect(merged.output.style).toBe('markdown');
    });

    test('should keep explicit file config filePath even when style is provided via CLI', () => {
      const merged = mergeConfigs(
        process.cwd(),
        { output: { filePath: 'from-file.txt' } },
        { output: { style: 'markdown' } },
      );
      expect(merged.output.filePath).toBe('from-file.txt');
      expect(merged.output.style).toBe('markdown');
    });

    test('should map default filename when style provided in file config and no filePath anywhere', () => {
      const merged = mergeConfigs(process.cwd(), { output: { style: 'plain' } }, {});
      expect(merged.output.filePath).toBe('repomix-output.txt');
      expect(merged.output.style).toBe('plain');
    });

    test('should merge skillGenerate boolean from CLI config', () => {
      const merged = mergeConfigs(process.cwd(), {}, { skillGenerate: true });
      expect(merged.skillGenerate).toBe(true);
    });

    test('should merge skillGenerate string from CLI config', () => {
      const merged = mergeConfigs(process.cwd(), {}, { skillGenerate: 'my-custom-skill' });
      expect(merged.skillGenerate).toBe('my-custom-skill');
    });

    test('should not include skillGenerate in merged config when undefined', () => {
      const merged = mergeConfigs(process.cwd(), {}, {});
      expect(merged.skillGenerate).toBeUndefined();
    });

    test('should not allow skillGenerate from file config (CLI-only option)', () => {
      // File config should not have skillGenerate - it's CLI-only
      // This test verifies that even if somehow passed, file config doesn't affect it
      const merged = mergeConfigs(process.cwd(), {}, { skillGenerate: 'from-cli' });
      expect(merged.skillGenerate).toBe('from-cli');
    });
  });
});
