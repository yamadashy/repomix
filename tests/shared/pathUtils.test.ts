import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { isPathWithin, toPosixPath } from '../../src/shared/pathUtils.js';

describe('pathUtils', () => {
  describe('isPathWithin', () => {
    test('treats equal paths as within', () => {
      expect(isPathWithin('/repo', '/repo', path.posix)).toBe(true);
      expect(isPathWithin('/repo/', '/repo', path.posix)).toBe(true);
    });

    test('accepts descendants', () => {
      expect(isPathWithin('/repo', '/repo/src/index.ts', path.posix)).toBe(true);
    });

    test('rejects the parent, siblings, and paths sharing a name prefix', () => {
      expect(isPathWithin('/repo', '/', path.posix)).toBe(false);
      expect(isPathWithin('/repo', '/other/file.ts', path.posix)).toBe(false);
      expect(isPathWithin('/repo', '/repo-evil/file.ts', path.posix)).toBe(false);
    });

    test('accepts children whose name starts with ".."', () => {
      expect(isPathWithin('/repo', '/repo/..foo', path.posix)).toBe(true);
      expect(isPathWithin('/repo', '/repo/..cache/file.ts', path.posix)).toBe(true);
    });

    test('handles Windows paths, including other drives and case-insensitive matches', () => {
      expect(isPathWithin('C:\\repo', 'C:\\repo\\src\\index.ts', path.win32)).toBe(true);
      expect(isPathWithin('C:\\repo', 'C:\\repo\\..foo\\x.ts', path.win32)).toBe(true);
      expect(isPathWithin('C:\\repo', 'c:\\REPO\\src', path.win32)).toBe(true);
      expect(isPathWithin('C:\\repo', 'C:\\other', path.win32)).toBe(false);
      expect(isPathWithin('C:\\repo', 'D:\\repo\\src', path.win32)).toBe(false);
    });

    test('uses the host path module by default', () => {
      const parent = path.resolve('some', 'dir');
      expect(isPathWithin(parent, path.join(parent, 'child'))).toBe(true);
      expect(isPathWithin(parent, path.dirname(parent))).toBe(false);
    });
  });

  describe('toPosixPath', () => {
    test('converts every backslash to a forward slash', () => {
      expect(toPosixPath('src\\core\\index.ts')).toBe('src/core/index.ts');
      expect(toPosixPath('C:\\repo\\a/b')).toBe('C:/repo/a/b');
    });

    test('leaves POSIX paths unchanged', () => {
      expect(toPosixPath('src/core/index.ts')).toBe('src/core/index.ts');
      expect(toPosixPath('')).toBe('');
    });
  });
});
