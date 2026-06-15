import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFileDisplayPath, buildRootLabels, joinDisplayPath } from '../../../src/core/packager/rootDisplayPath.js';

// Build absolute paths from a resolved virtual base so the tests stay
// deterministic and cross-platform (buildRootLabels uses path.resolve/relative).
const base = path.resolve('virtual-root-for-rootDisplayPath-test');
const cwd = path.join(base, 'work');

describe('rootDisplayPath', () => {
  describe('buildRootLabels', () => {
    it('uses basenames for distinct roots inside cwd', () => {
      const roots = [path.join(cwd, 'frontend'), path.join(cwd, 'backend')];
      expect(buildRootLabels(roots, cwd)).toEqual(['frontend', 'backend']);
    });

    it('uses the cwd-relative path for nested roots inside cwd', () => {
      const roots = [path.join(cwd, 'packages', 'a'), path.join(cwd, 'packages', 'b')];
      expect(buildRootLabels(roots, cwd)).toEqual(['packages/a', 'packages/b']);
    });

    it('uses only the basename for roots outside cwd (no parent leakage)', () => {
      const roots = [path.join(base, 'other', 'foo'), path.join(base, 'other', 'bar')];
      expect(buildRootLabels(roots, cwd)).toEqual(['foo', 'bar']);
    });

    it('falls back to a numeric suffix when outside-cwd basenames collide', () => {
      const roots = [path.join(base, 'x', 'app'), path.join(base, 'y', 'app')];
      expect(buildRootLabels(roots, cwd)).toEqual(['app', 'app-2']);
    });

    it('disambiguates a collision between an inside-cwd and an outside-cwd root', () => {
      const roots = [path.join(cwd, 'app'), path.join(base, 'other', 'app')];
      expect(buildRootLabels(roots, cwd)).toEqual(['app', 'app-2']);
    });

    it('returns the single label unchanged for one root', () => {
      expect(buildRootLabels([path.join(cwd, 'frontend')], cwd)).toEqual(['frontend']);
    });
  });

  describe('joinDisplayPath', () => {
    it('joins a root label and file path with a posix separator', () => {
      expect(joinDisplayPath('app', 'src/index.ts')).toBe('app/src/index.ts');
    });

    it('normalizes windows separators in the file path', () => {
      expect(joinDisplayPath('app', `src${path.win32.sep}index.ts`)).toBe('app/src/index.ts');
    });

    it('trims redundant leading/trailing slashes', () => {
      expect(joinDisplayPath('/app/', '/README.md')).toBe('app/README.md');
    });

    it('returns just the label when the file path is empty', () => {
      expect(joinDisplayPath('app', '')).toBe('app');
    });

    it('falls back to "root" when the label is empty', () => {
      expect(joinDisplayPath('', 'README.md')).toBe('root/README.md');
    });
  });

  describe('buildFileDisplayPath', () => {
    it('keeps target-relative paths unchanged for the default style', () => {
      expect(
        buildFileDisplayPath({
          rootDir: path.join(base, 'other', 'core-library'),
          filePath: 'src/core.py',
          cwd,
          filePathStyle: 'target-relative',
        }),
      ).toBe('src/core.py');
    });

    it('uses a multi-root label for target-relative paths when provided', () => {
      expect(
        buildFileDisplayPath({
          rootDir: path.join(base, 'other', 'core-library'),
          filePath: 'src/core.py',
          cwd,
          filePathStyle: 'target-relative',
          rootLabel: 'core-library',
        }),
      ).toBe('core-library/src/core.py');
    });

    it('uses cwd-relative paths for roots outside cwd', () => {
      expect(
        buildFileDisplayPath({
          rootDir: path.join(base, 'core-library'),
          filePath: 'src/core.py',
          cwd,
          filePathStyle: 'cwd-relative',
        }),
      ).toBe('../core-library/src/core.py');
    });

    it('uses cwd-relative paths for nested roots inside cwd', () => {
      expect(
        buildFileDisplayPath({
          rootDir: path.join(cwd, 'packages', 'app'),
          filePath: 'src/index.ts',
          cwd,
          filePathStyle: 'cwd-relative',
        }),
      ).toBe('packages/app/src/index.ts');
    });

    it('normalizes cwd-relative paths to posix separators', () => {
      expect(
        buildFileDisplayPath({
          rootDir: path.join(cwd, 'packages', 'app'),
          filePath: `src${path.win32.sep}index.ts`,
          cwd,
          filePathStyle: 'cwd-relative',
        }),
      ).toBe('packages/app/src/index.ts');
    });
  });
});
