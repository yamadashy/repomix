import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { sortPaths } from '../../../src/core/file/filePathSort.js';

describe('filePathSort', () => {
  const sep = path.sep;

  test('should sort directories before files', () => {
    const input = ['file.txt', `dir${sep}`, 'another_file.js', `another_dir${sep}`];
    const expected = [`another_dir${sep}`, `dir${sep}`, 'another_file.js', 'file.txt'];
    expect(sortPaths(input)).toEqual(expected);
  });

  test('should sort subdirectories correctly', () => {
    const input = [`dir${sep}subdir${sep}file.txt`, `dir${sep}file.js`, `dir${sep}subdir${sep}`, 'file.txt'];
    const expected = [`dir${sep}subdir${sep}`, `dir${sep}subdir${sep}file.txt`, `dir${sep}file.js`, 'file.txt'];
    expect(sortPaths(input)).toEqual(expected);
  });

  test('should sort files alphabetically within the same directory', () => {
    const input = [`dir${sep}c.txt`, `dir${sep}a.txt`, `dir${sep}b.txt`];
    const expected = [`dir${sep}a.txt`, `dir${sep}b.txt`, `dir${sep}c.txt`];
    expect(sortPaths(input)).toEqual(expected);
  });

  test('should handle empty input', () => {
    expect(sortPaths([])).toEqual([]);
  });

  test('should handle complex directory structure', () => {
    const input = [
      `src${sep}utils${sep}file3.ts`,
      `src${sep}index.ts`,
      `tests${sep}utils${sep}a.ts`,
      `src${sep}utils${sep}b.ts`,
      'package.json',
      'README.md',
      `src${sep}components${sep}Component.tsx`,
    ];
    const expected = [
      `src${sep}components${sep}Component.tsx`,
      `src${sep}utils${sep}b.ts`,
      `src${sep}utils${sep}file3.ts`,
      `src${sep}index.ts`,
      `tests${sep}utils${sep}a.ts`,
      'package.json',
      'README.md',
    ];
    expect(sortPaths(input)).toEqual(expected);
  });

  test('should handle paths with multiple separators', () => {
    const input = [`a${sep}b${sep}c`, `a${sep}b`, `a${sep}b${sep}`];
    const expected = [`a${sep}b`, `a${sep}b${sep}`, `a${sep}b${sep}c`];
    expect(sortPaths(input)).toEqual(expected);
  });

  test('should be case-insensitive', () => {
    const input = [`B${sep}`, `a${sep}`, 'C', 'd'];
    const expected = [`a${sep}`, `B${sep}`, 'C', 'd'];
    expect(sortPaths(input)).toEqual(expected);
  });

  // globby/buildFileDisplayPath always hand out "/"-separated paths, even on Windows
  // where path.sep is "\\". Backslash input here stands in for that separator/path.sep
  // mismatch: the directory-aware ordering must not depend on the OS separator.
  test('should treat separators independently of the OS separator', () => {
    const input = ['dir\\subdir\\file.txt', 'dir\\file.js', 'dir\\subdir\\', 'file.txt'];
    const expected = ['dir\\subdir\\', 'dir\\subdir\\file.txt', 'dir\\file.js', 'file.txt'];
    expect(sortPaths(input)).toEqual(expected);
  });
});
