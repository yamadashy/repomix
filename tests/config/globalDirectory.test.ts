import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getGlobalDirectory } from '../../src/config/globalDirectory.js';

describe('getGlobalDirectory', () => {
  const homedir = vi.fn<() => string>();
  const deps = { homedir };
  const originalPlatform = process.platform;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    process.env = originalEnv;
  });

  describe('Windows platform', () => {
    test('should use LOCALAPPDATA when available', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local';

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('C:\\Users\\Test\\AppData\\Local', 'Repomix'));
    });

    test('should fall back to homedir when LOCALAPPDATA is not available', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.LOCALAPPDATA = undefined;
      homedir.mockReturnValue('C:\\Users\\Test');

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('C:\\Users\\Test', 'AppData', 'Local', 'Repomix'));
    });
  });

  describe('Unix platforms', () => {
    test('should use XDG_CONFIG_HOME when available', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = '/custom/config';

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('/custom/config', 'repomix'));
    });

    test('should fall back to ~/.config on Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = undefined;
      homedir.mockReturnValue('/home/test');

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('/home/test', '.config', 'repomix'));
    });

    test('should fall back to ~/.config on macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.XDG_CONFIG_HOME = undefined;
      homedir.mockReturnValue('/Users/test');

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('/Users/test', '.config', 'repomix'));
    });
  });

  describe('Edge cases', () => {
    test('should handle empty homedir', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = undefined;
      homedir.mockReturnValue('');

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('', '.config', 'repomix'));
    });

    test('should handle unusual XDG_CONFIG_HOME paths', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = '////multiple///slashes///';

      const result = getGlobalDirectory(deps);
      expect(result).toBe(path.join('////multiple///slashes///', 'repomix'));
    });
  });
});
