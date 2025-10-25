import { constants } from 'node:fs';
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
    test('should return success when all permissions are available', async () => {
      // Mock successful readdir
      vi.mocked(fs.readdir).mockResolvedValue([]);

      // Mock successful access checks
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: true,
        details: {
          read: true,
          write: true,
          execute: true,
        },
      });

      // Verify all permission checks were called
      expect(fs.access).toHaveBeenCalledWith(testDirPath, constants.R_OK);
      expect(fs.access).toHaveBeenCalledWith(testDirPath, constants.W_OK);
      expect(fs.access).toHaveBeenCalledWith(testDirPath, constants.X_OK);
    });

    test('should pass with only required permissions', async () => {
      // Mock successful readdir
      vi.mocked(fs.readdir).mockResolvedValue([]);

      // Mock mixed permission check results
      vi.mocked(fs.access).mockImplementation(async (_path, mode) => {
        if (mode === constants.R_OK || mode === constants.X_OK) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('Permission denied'));
      });

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        details: {
          read: true,
          write: false,
          execute: true,
        },
      });
    });
  });

  describe('error cases', () => {
    test('should handle EPERM error', async () => {
      const error = new Error('Permission denied');
      (error as NodeJS.ErrnoException).code = 'EPERM';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        error: expect.any(PermissionError),
      });
      expect(result.error).toBeInstanceOf(PermissionError);
      expect(result.error?.message).toContain('Permission denied');
    });

    test('should handle EACCES error', async () => {
      const error = new Error('Access denied');
      (error as NodeJS.ErrnoException).code = 'EACCES';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        error: expect.any(PermissionError),
      });
      expect(result.error).toBeInstanceOf(PermissionError);
      expect(result.error?.message).toContain('Permission denied');
    });

    test('should handle EISDIR error', async () => {
      const error = new Error('Is a directory');
      (error as NodeJS.ErrnoException).code = 'EISDIR';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        error: expect.any(PermissionError),
      });
    });

    test('should handle non-Error objects', async () => {
      vi.mocked(fs.readdir).mockRejectedValue('String error');

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        error: new Error('String error'),
      });
    });
  });

  describe('platform specific behavior', () => {
    test('should return macOS specific error message', async () => {
      // Mock platform as macOS
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
      // Mock platform as Windows
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
        hasAllPermission: false,
        error: error,
      });
    });

    test('should handle undefined error code', async () => {
      const error = new Error('Permission denied');
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        error: error,
      });
    });

    test('should handle partial permission checks failing', async () => {
      // Mock successful readdir
      vi.mocked(fs.readdir).mockResolvedValue([]);

      // Mock access to fail for write permission only
      vi.mocked(fs.access).mockImplementation(async (_path, mode) => {
        if (mode === constants.W_OK) {
          throw new Error('Write permission denied');
        }
        return Promise.resolve(undefined);
      });

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        details: {
          read: true,
          write: false,
          execute: true,
        },
      });
    });

    test('should handle all permission checks failing', async () => {
      // Mock successful readdir
      vi.mocked(fs.readdir).mockResolvedValue([]);

      // Mock all access checks to fail
      vi.mocked(fs.access).mockRejectedValue(new Error('Permission denied'));

      const result = await checkDirectoryPermissions(testDirPath);

      expect(result).toEqual({
        hasAllPermission: false,
        details: {
          read: false,
          write: false,
          execute: false,
        },
      });
    });
  });
});
