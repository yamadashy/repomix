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

    test('should skip node_modules', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/node_modules/lodash/index.js')).toBe(false);
      expect(filter('repo-main/node_modules/.package-lock.json')).toBe(false);
      expect(filter('repo-main/src/node_modules/foo/bar.js')).toBe(false);
    });

    test('should skip build output directories', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/dist/index.js')).toBe(false);
      expect(filter('repo-main/build/bundle.js')).toBe(false);
      expect(filter('repo-main/out/main.js')).toBe(false);
      expect(filter('repo-main/.next/cache/data.json')).toBe(false);
    });

    test('should skip lock files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/package-lock.json')).toBe(false);
      expect(filter('repo-main/yarn.lock')).toBe(false);
      expect(filter('repo-main/pnpm-lock.yaml')).toBe(false);
    });

    test('should skip binary files by extension', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/image.png')).toBe(false);
      expect(filter('repo-main/photo.jpg')).toBe(false);
      expect(filter('repo-main/assets/icon.ico')).toBe(false);
      expect(filter('repo-main/font.woff2')).toBe(false);
      expect(filter('repo-main/archive.zip')).toBe(false);
    });

    test('should skip .git directory', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/.git/config')).toBe(false);
      expect(filter('repo-main/.git/HEAD')).toBe(false);
    });

    test('should skip editor and IDE directories', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/.idea/workspace.xml')).toBe(false);
      expect(filter('repo-main/.vscode/settings.json')).toBe(false);
    });

    test('should skip Python cache directories', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/__pycache__/module.pyc')).toBe(false);
      expect(filter('repo-main/src/__pycache__/utils.pyc')).toBe(false);
      expect(filter('repo-main/venv/lib/python3.9/site.py')).toBe(false);
    });

    test('should skip OS generated files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/.DS_Store')).toBe(false);
      expect(filter('repo-main/src/.DS_Store')).toBe(false);
    });

    test('should skip coverage directories', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/coverage/lcov.info')).toBe(false);
      expect(filter('repo-main/.nyc_output/data.json')).toBe(false);
    });

    test('should support custom ignore patterns', () => {
      const filter = createArchiveEntryFilter(stripComponents, ['docs/**']);

      expect(filter('repo-main/docs/guide.md')).toBe(false);
      expect(filter('repo-main/docs/api/reference.md')).toBe(false);
      expect(filter('repo-main/src/index.ts')).toBe(true);
    });

    test('should handle strip components of 0', () => {
      const filter = createArchiveEntryFilter(0);

      expect(filter('src/index.ts')).toBe(true);
      expect(filter('node_modules/lodash/index.js')).toBe(false);
      expect(filter('dist/bundle.js')).toBe(false);
    });

    test('should allow dotfiles that are not in ignore list', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/.eslintrc.js')).toBe(true);
      expect(filter('repo-main/.prettierrc')).toBe(true);
      expect(filter('repo-main/.github/workflows/ci.yml')).toBe(true);
    });

    test('should skip log files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/error.log')).toBe(false);
      expect(filter('repo-main/debug.log')).toBe(false);
    });

    test('should skip repomix output files', () => {
      const filter = createArchiveEntryFilter(stripComponents);

      expect(filter('repo-main/repomix-output.xml')).toBe(false);
      expect(filter('repo-main/repomix-output.md')).toBe(false);
    });
  });
});
