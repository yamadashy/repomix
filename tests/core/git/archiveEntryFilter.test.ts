import { describe, expect, test, vi } from 'vitest';
import { createArchiveEntryFilter } from '../../../src/core/git/archiveEntryFilter.js';

vi.mock('../../../src/shared/logger');

describe('archiveEntryFilter', () => {
  describe('createArchiveEntryFilter', () => {
    const stripComponents = 1;

    test('should allow normal source files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/src/index.ts')).toBe(true);
      expect(filter('repo-main/README.md')).toBe(true);
      expect(filter('repo-main/package.json')).toBe(true);
      expect(filter('repo-main/src/utils/helper.js')).toBe(true);
    });

    test('should always allow the top-level directory entry', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/')).toBe(true);
      expect(filter('repo-main')).toBe(true);
    });

    test('should skip binary image files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/image.png')).toBe(false);
      expect(filter('repo-main/photo.jpg')).toBe(false);
      expect(filter('repo-main/icon.gif')).toBe(false);
      expect(filter('repo-main/assets/logo.svg')).toBe(true); // SVG is text
    });

    test('should skip font files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/font.woff')).toBe(false);
      expect(filter('repo-main/font.woff2')).toBe(false);
      expect(filter('repo-main/font.ttf')).toBe(false);
      expect(filter('repo-main/font.eot')).toBe(false);
    });

    test('should skip archive and executable files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/archive.zip')).toBe(false);
      expect(filter('repo-main/archive.tar.gz')).toBe(false);
      expect(filter('repo-main/program.exe')).toBe(false);
    });

    test('should skip other binary files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/assets/icon.ico')).toBe(false);
      expect(filter('repo-main/data.pdf')).toBe(false);
      expect(filter('repo-main/doc.docx')).toBe(false);
    });

    test('should allow text-based config and data files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/.eslintrc.js')).toBe(true);
      expect(filter('repo-main/.prettierrc')).toBe(true);
      expect(filter('repo-main/tsconfig.json')).toBe(true);
      expect(filter('repo-main/data.yaml')).toBe(true);
      expect(filter('repo-main/style.css')).toBe(true);
    });

    test('should allow files in nested directories', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/src/components/Button.tsx')).toBe(true);
      expect(filter('repo-main/node_modules/lodash/index.js')).toBe(true); // not filtered by binary check
    });

    test('should handle strip components of 0', () => {
      const filter = createArchiveEntryFilter(0);

      expect(filter('src/index.ts')).toBe(true);
      expect(filter('image.png')).toBe(false);
    });
  });
});
