import { describe, expect, test } from 'vitest';
import {
  type FilesByRoot,
  generateTreeString,
  generateTreeStringWithRoots,
} from '../../../src/core/file/fileTreeGenerate.js';

describe('fileTreeGenerate', () => {
  describe('generateTreeString', () => {
    test('generates a flat tree for single directory files', () => {
      const files = ['file1.txt', 'file2.txt', 'subdir/nested.txt'];
      const result = generateTreeString(files);

      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
      expect(result).toContain('subdir/');
      expect(result).toContain('nested.txt');
    });
  });

  describe('generateTreeStringWithRoots', () => {
    test('returns standard flat tree for single root', () => {
      const filesByRoot: FilesByRoot[] = [{ rootLabel: 'project', files: ['file1.txt', 'file2.txt'] }];

      const result = generateTreeStringWithRoots(filesByRoot);

      // Should not have root label for single root
      expect(result).not.toContain('[project]');
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
    });

    test('generates labeled sections for multiple roots', () => {
      const filesByRoot: FilesByRoot[] = [
        { rootLabel: 'cli', files: ['cliRun.ts', 'types.ts'] },
        { rootLabel: 'config', files: ['configLoad.ts', 'configSchema.ts'] },
      ];

      const result = generateTreeStringWithRoots(filesByRoot);

      // Should have root labels
      expect(result).toContain('[cli]/');
      expect(result).toContain('[config]/');

      // Should have files under each label
      expect(result).toContain('cliRun.ts');
      expect(result).toContain('types.ts');
      expect(result).toContain('configLoad.ts');
      expect(result).toContain('configSchema.ts');
    });

    test('generates labeled sections with nested directories', () => {
      const filesByRoot: FilesByRoot[] = [
        { rootLabel: 'src', files: ['index.ts', 'utils/helper.ts', 'utils/format.ts'] },
        { rootLabel: 'tests', files: ['index.test.ts'] },
      ];

      const result = generateTreeStringWithRoots(filesByRoot);

      expect(result).toContain('[src]/');
      expect(result).toContain('[tests]/');
      expect(result).toContain('utils/');
      expect(result).toContain('helper.ts');
    });

    test('skips empty root sections', () => {
      const filesByRoot: FilesByRoot[] = [
        { rootLabel: 'cli', files: ['cliRun.ts'] },
        { rootLabel: 'empty', files: [] },
        { rootLabel: 'config', files: ['configLoad.ts'] },
      ];

      const result = generateTreeStringWithRoots(filesByRoot);

      expect(result).toContain('[cli]/');
      expect(result).not.toContain('[empty]/');
      expect(result).toContain('[config]/');
    });

    test('handles single root falling back to standard behavior', () => {
      const filesByRoot: FilesByRoot[] = [{ rootLabel: 'project', files: ['a.txt', 'b/c.txt'] }];

      const singleRootResult = generateTreeStringWithRoots(filesByRoot);
      const standardResult = generateTreeString(['a.txt', 'b/c.txt']);

      // Should be identical
      expect(singleRootResult).toBe(standardResult);
    });
  });
});
