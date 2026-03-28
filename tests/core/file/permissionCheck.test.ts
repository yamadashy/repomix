import * as fs from 'node:fs/promises';
import { platform } from 'node:os';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { checkDirectoryPermissions, PermissionError } from '../../../src/core/file/permissionCheck.js';

vi.mock('node:fs/promises');
vi.mock('node:os');

describe('permissionCheck', () => {
  const testDirPath = '/test/directory';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(platform).mockReturnValue('linux');
  });

  describe('successful cases', () => {
    test('should return success when directory is readable', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({ readable: true });
      expect(fs.readdir).toHaveBeenCalledWith(testDirPath);
    });
  });

  describe('error cases', () => {
    test('should handle EPERM error', async () => {
      const error = new Error('Permission denied');
      (error as NodeJS.ErrnoException).code = 'EPERM';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.readable).toBe(false);
      expect(result.error).toBeInstanceOf(PermissionError);
      expect(result.error?.message).toContain('Permission denied');
    });

    test('should handle EACCES error', async () => {
      const error = new Error('Access denied');
      (error as NodeJS.ErrnoException).code = 'EACCES';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.readable).toBe(false);
      expect(result.error).toBeInstanceOf(PermissionError);
      expect(result.error?.message).toContain('Permission denied');
    });

    test('should handle EISDIR error', async () => {
      const error = new Error('Is a directory');
      (error as NodeJS.ErrnoException).code = 'EISDIR';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.readable).toBe(false);
      expect(result.error).toBeInstanceOf(PermissionError);
    });

    test('should handle non-Error objects', async () => {
      vi.mocked(fs.readdir).mockRejectedValue('String error');

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        readable: false,
        error: new Error('String error'),
      });
    });
  });

  describe('platform specific behavior', () => {
    test('should return macOS specific error message', async () => {
      vi.mocked(platform).mockReturnValue('darwin');

      const error = new Error('Permission denied');
      (error as NodeJS.ErrnoException).code = 'EACCES';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.error).toBeInstanceOf(PermissionError);
      expect(result.error?.message).toContain('macOS security restrictions');
      expect(result.error?.message).toContain('System Settings');
      expect(result.error?.message).toContain('Privacy & Security');
    });

    test('should return standard error message for non-macOS platforms', async () => {
      vi.mocked(platform).mockReturnValue('win32');

      const error = new Error('Permission denied');
      (error as NodeJS.ErrnoException).code = 'EACCES';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.error).toBeInstanceOf(PermissionError);
      expect(result.error?.message).toBe(`Permission denied: Cannot access '${testDirPath}'`);
      expect(result.error?.message).not.toContain('macOS security restrictions');
    });
  });

  describe('PermissionError class', () => {
    test('should create PermissionError with correct properties', () => {
      const message = 'Test error message';
      const path = '/test/path';
      const code = 'EACCES';

      const error = new PermissionError(message, path, code);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('PermissionError');
      expect(error.message).toBe(message);
      expect(error.path).toBe(path);
      expect(error.code).toBe(code);
    });

    test('should create PermissionError without code', () => {
      const message = 'Test error message';
      const path = '/test/path';

      const error = new PermissionError(message, path);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('PermissionError');
      expect(error.message).toBe(message);
      expect(error.path).toBe(path);
      expect(error.code).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should handle EPERM error on macOS with specific message', async () => {
      vi.mocked(platform).mockReturnValue('darwin');
      const error = new Error('Permission denied');
      (error as NodeJS.ErrnoException).code = 'EPERM';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.error).toBeInstanceOf(PermissionError);
      expect((result.error as PermissionError).code).toBe('EPERM');
      expect(result.error?.message).toContain('macOS security restrictions');
    });

    test('should handle EISDIR error on macOS with specific message', async () => {
      vi.mocked(platform).mockReturnValue('darwin');
      const error = new Error('Is a directory');
      (error as NodeJS.ErrnoException).code = 'EISDIR';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result.error).toBeInstanceOf(PermissionError);
      expect((result.error as PermissionError).code).toBe('EISDIR');
      expect(result.error?.message).toContain('macOS security restrictions');
    });

    test('should handle unknown error code with default case', async () => {
      const error = new Error('Unknown error');
      (error as NodeJS.ErrnoException).code = 'EUNKNOWN';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        readable: false,
        error: error,
      });
    });

    test('should handle undefined error code', async () => {
      const error = new Error('Permission denied');
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        readable: false,
        error: error,
      });
    });
  });
});
