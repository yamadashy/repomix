import { describe, expect, it } from 'vitest';
import {
  getSubmodule,
  getSubmoduleNames,
  loadMonorepoConfig,
  MONOREPO_CONFIG_FILE,
  type MonorepoConfig,
} from '../../../src/mcp/config/monorepoConfigLoader.js';

describe('monorepoConfigLoader', () => {
  describe('loadMonorepoConfig', () => {
    it('should return null when config file does not exist', async () => {
      const result = await loadMonorepoConfig('/nonexistent/path');
      expect(result).toBeNull();
    });
  });

  describe('getSubmodule', () => {
    it('should return submodule config by name', () => {
      const config: MonorepoConfig = {
        submodules: {
          'crate-foo': {
            path: 'crates/foo',
            description: 'Test crate',
            dependencies: ['crate-bar'],
            isGitSubmodule: false,
          },
          'crate-bar': {
            path: 'crates/bar',
            dependencies: [],
            isGitSubmodule: false,
          },
        },
        cache: { directory: '.repomix-cache', enabled: true },
        repomix: { compress: true, style: 'xml', removeComments: false, showLineNumbers: true },
      };

      const submodule = getSubmodule(config, 'crate-foo');
      expect(submodule).not.toBeNull();
      expect(submodule?.path).toBe('crates/foo');
      expect(submodule?.description).toBe('Test crate');
    });

    it('should return null for unknown submodule', () => {
      const config: MonorepoConfig = {
        submodules: {},
        cache: { directory: '.repomix-cache', enabled: true },
        repomix: { compress: true, style: 'xml', removeComments: false, showLineNumbers: true },
      };

      expect(getSubmodule(config, 'unknown')).toBeNull();
    });
  });

  describe('getSubmoduleNames', () => {
    it('should return all submodule names', () => {
      const config: MonorepoConfig = {
        submodules: {
          'crate-a': { path: 'crates/a', dependencies: [], isGitSubmodule: false },
          'crate-b': { path: 'crates/b', dependencies: [], isGitSubmodule: false },
          'crate-c': { path: 'crates/c', dependencies: [], isGitSubmodule: false },
        },
        cache: { directory: '.repomix-cache', enabled: true },
        repomix: { compress: true, style: 'xml', removeComments: false, showLineNumbers: true },
      };

      const names = getSubmoduleNames(config);
      expect(names).toEqual(['crate-a', 'crate-b', 'crate-c']);
    });

    it('should return empty array for empty config', () => {
      const config: MonorepoConfig = {
        submodules: {},
        cache: { directory: '.repomix-cache', enabled: true },
        repomix: { compress: true, style: 'xml', removeComments: false, showLineNumbers: true },
      };

      expect(getSubmoduleNames(config)).toEqual([]);
    });
  });

  describe('MONOREPO_CONFIG_FILE', () => {
    it('should have correct filename', () => {
      expect(MONOREPO_CONFIG_FILE).toBe('.repomix-monorepo.json');
    });
  });
});
