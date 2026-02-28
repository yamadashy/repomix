import { describe, expect, test } from 'vitest';
import { mergeConfigs } from '../../src/config/configLoad.js';
import type { RepomixConfigCli, RepomixConfigFile } from '../../src/config/configSchema.js';

describe('configMerge', () => {
  describe('ignore settings merge', () => {
    test('should preserve useDotIgnore when customPatterns is defined in fileConfig', () => {
      const cwd = '/test/dir';
      const fileConfig: RepomixConfigFile = {
        ignore: {
          customPatterns: ['bin/'],
        },
      };
      const cliConfig: RepomixConfigCli = {};

      const merged = mergeConfigs(cwd, fileConfig, cliConfig);

      // useDotIgnore should be true by default and should not be affected by customPatterns
      expect(merged.ignore.useDotIgnore).toBe(true);
      expect(merged.ignore.useGitignore).toBe(true);
      expect(merged.ignore.useDefaultPatterns).toBe(true);
      expect(merged.ignore.customPatterns).toEqual(['bin/']);
    });

    test('should preserve all ignore settings when customPatterns is defined', () => {
      const cwd = '/test/dir';
      const fileConfig: RepomixConfigFile = {
        ignore: {
          customPatterns: ['bin/', 'tmp/'],
        },
      };
      const cliConfig: RepomixConfigCli = {};

      const merged = mergeConfigs(cwd, fileConfig, cliConfig);

      expect(merged.ignore).toEqual({
        useGitignore: true,
        useDotIgnore: true,
        useDefaultPatterns: true,
        customPatterns: ['bin/', 'tmp/'],
      });
    });

    test('should allow explicitly disabling useDotIgnore', () => {
      const cwd = '/test/dir';
      const fileConfig: RepomixConfigFile = {
        ignore: {
          useDotIgnore: false,
          customPatterns: ['bin/'],
        },
      };
      const cliConfig: RepomixConfigCli = {};

      const merged = mergeConfigs(cwd, fileConfig, cliConfig);

      expect(merged.ignore.useDotIgnore).toBe(false);
      expect(merged.ignore.useGitignore).toBe(true);
      expect(merged.ignore.customPatterns).toEqual(['bin/']);
    });

    test('should merge customPatterns from all sources', () => {
      const cwd = '/test/dir';
      const fileConfig: RepomixConfigFile = {
        ignore: {
          customPatterns: ['from-file/'],
        },
      };
      const cliConfig: RepomixConfigCli = {
        ignore: {
          customPatterns: ['from-cli/'],
        },
      };

      const merged = mergeConfigs(cwd, fileConfig, cliConfig);

      expect(merged.ignore.customPatterns).toEqual(['from-file/', 'from-cli/']);
      expect(merged.ignore.useDotIgnore).toBe(true);
    });
  });
});
