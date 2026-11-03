import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getGlobalDirectory } from '../../src/config/globalDirectory.js';

describe('getGlobalDirectory', () => {
  const homedir = vi.fn<() => string>();
  const depsFor = (platform: NodeJS.Platform, env: NodeJS.ProcessEnv = {}) => ({ homedir, platform, env });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Windows platform', () => {
    test('should use LOCALAPPDATA when available', () => {
      const result = getGlobalDirectory(depsFor('win32', { LOCALAPPDATA: 'C:\\Users\\Test\\AppData\\Local' }));
      expect(result).toBe(path.join('C:\\Users\\Test\\AppData\\Local', 'Repomix'));
    });

    test('should fall back to homedir when LOCALAPPDATA is not available', () => {
      homedir.mockReturnValue('C:\\Users\\Test');

      const result = getGlobalDirectory(depsFor('win32'));
      expect(result).toBe(path.join('C:\\Users\\Test', 'AppData', 'Local', 'Repomix'));
    });
  });

  describe('Unix platforms', () => {
    test('should use XDG_CONFIG_HOME when available', () => {
      const result = getGlobalDirectory(depsFor('linux', { XDG_CONFIG_HOME: '/custom/config' }));
      expect(result).toBe(path.join('/custom/config', 'repomix'));
    });

    test('should fall back to ~/.config on Linux', () => {
      homedir.mockReturnValue('/home/test');

      const result = getGlobalDirectory(depsFor('linux'));
      expect(result).toBe(path.join('/home/test', '.config', 'repomix'));
    });

    test('should fall back to ~/.config on macOS', () => {
      homedir.mockReturnValue('/Users/test');

      const result = getGlobalDirectory(depsFor('darwin'));
      expect(result).toBe(path.join('/Users/test', '.config', 'repomix'));
    });
  });

  describe('Edge cases', () => {
    test('should handle empty homedir', () => {
      homedir.mockReturnValue('');

      const result = getGlobalDirectory(depsFor('linux'));
      expect(result).toBe(path.join('', '.config', 'repomix'));
    });

    test('should handle unusual XDG_CONFIG_HOME paths', () => {
      const result = getGlobalDirectory(depsFor('linux', { XDG_CONFIG_HOME: '////multiple///slashes///' }));
      expect(result).toBe(path.join('////multiple///slashes///', 'repomix'));
    });
  });
});
