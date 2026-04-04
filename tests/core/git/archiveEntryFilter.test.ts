import { describe, expect, test, vi } from 'vitest';
import { createArchiveEntryFilter } from '../../../src/core/git/archiveEntryFilter.js';

vi.mock('../../../src/shared/logger');

describe('archiveEntryFilter', () => {
  describe('createArchiveEntryFilter', () => {
    test('should allow text files', () => {
      const filter = createArchiveEntryFilter();
      expect(filter('repo-main/src/index.ts')).toBe(true);
      expect(filter('repo-main/README.md')).toBe(true);
      expect(filter('repo-main/package.json')).toBe(true);
    });

    test('should skip binary image files', () => {
      const filter = createArchiveEntryFilter();
      expect(filter('repo-main/assets/logo.png')).toBe(false);
      expect(filter('repo-main/images/photo.jpg')).toBe(false);
      expect(filter('repo-main/icon.gif')).toBe(false);
    });

    test('should skip font files', () => {
      const filter = createArchiveEntryFilter();
      expect(filter('repo-main/fonts/inter.woff2')).toBe(false);
      expect(filter('repo-main/fonts/roboto.woff')).toBe(false);
      expect(filter('repo-main/fonts/arial.ttf')).toBe(false);
    });

    test('should skip archive and executable files', () => {
      const filter = createArchiveEntryFilter();
      expect(filter('repo-main/dist/app.exe')).toBe(false);
      expect(filter('repo-main/vendor/lib.zip')).toBe(false);
    });

    test('should allow root directory entry', () => {
      const filter = createArchiveEntryFilter();
      expect(filter('repo-main/')).toBe(true);
    });

    test('should handle nested directory paths', () => {
      const filter = createArchiveEntryFilter();
      expect(filter('repo-main/src/components/Button.tsx')).toBe(true);
      expect(filter('repo-main/src/assets/icons/arrow.png')).toBe(false);
    });

    test('should strip leading segment correctly for various repo name formats', () => {
      const filter = createArchiveEntryFilter();
      // Different repository name formats in tar archives
      expect(filter('yamadashy-repomix-abc123/src/index.ts')).toBe(true);
      expect(filter('yamadashy-repomix-abc123/logo.png')).toBe(false);
    });

    test('should use injected isBinaryPath dependency', () => {
      const mockIsBinaryPath = vi.fn().mockReturnValue(true);
      const filter = createArchiveEntryFilter({ isBinaryPath: mockIsBinaryPath });

      const result = filter('repo-main/src/index.ts');

      expect(result).toBe(false);
      expect(mockIsBinaryPath).toHaveBeenCalledWith('src/index.ts');
    });

    test('should pass stripped path to isBinaryPath', () => {
      const mockIsBinaryPath = vi.fn().mockReturnValue(false);
      const filter = createArchiveEntryFilter({ isBinaryPath: mockIsBinaryPath });

      filter('repo-main/src/deep/file.ts');

      expect(mockIsBinaryPath).toHaveBeenCalledWith('src/deep/file.ts');
    });
  });
});
