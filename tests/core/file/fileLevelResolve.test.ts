import { describe, expect, it } from 'vitest';
import { resolveFileLevel } from '../../../src/core/file/fileLevelResolve.js';

describe('resolveFileLevel', () => {
  describe('without patterns (backward compatibility)', () => {
    it('returns "full" when there are no patterns and global compress is off', () => {
      expect(resolveFileLevel('src/index.ts', { compress: false })).toBe('full');
    });

    it('returns "compress" when there are no patterns and global compress is on', () => {
      expect(resolveFileLevel('src/index.ts', { compress: true })).toBe('compress');
    });

    it('treats an empty patterns array the same as no patterns (falls back to global)', () => {
      expect(resolveFileLevel('src/index.ts', { compress: true, patterns: [] })).toBe('compress');
      expect(resolveFileLevel('src/index.ts', { compress: false, patterns: [] })).toBe('full');
    });

    it('treats an undefined global compress as "full"', () => {
      expect(resolveFileLevel('src/index.ts', {})).toBe('full');
    });
  });

  describe('per-pattern levels', () => {
    it('returns "compress" for a file matching a compress pattern', () => {
      expect(
        resolveFileLevel('docs/guide.md', { compress: false, patterns: [{ pattern: 'docs/**/*', compress: true }] }),
      ).toBe('compress');
    });

    it('returns "directory-only" for a file matching a directoryStructureOnly pattern', () => {
      expect(
        resolveFileLevel('website/index.html', {
          compress: false,
          patterns: [{ pattern: 'website/**/*', directoryStructureOnly: true }],
        }),
      ).toBe('directory-only');
    });

    it('returns "full" for a matched pattern that sets no level flags', () => {
      expect(resolveFileLevel('src/index.ts', { compress: false, patterns: [{ pattern: 'src/**/*' }] })).toBe('full');
    });
  });

  describe('first match wins', () => {
    it('uses the first matching pattern and ignores later overlapping ones', () => {
      const output = {
        compress: false,
        patterns: [
          { pattern: 'docs/**/*', compress: true },
          { pattern: 'docs/**/*', directoryStructureOnly: true },
        ],
      };
      expect(resolveFileLevel('docs/guide.md', output)).toBe('compress');
    });

    it('falls back to the global behavior when no pattern matches', () => {
      const patterns = [{ pattern: 'docs/**/*', compress: true }];
      expect(resolveFileLevel('src/index.ts', { compress: true, patterns })).toBe('compress');
      expect(resolveFileLevel('src/index.ts', { compress: false, patterns })).toBe('full');
    });
  });

  describe('flag override semantics', () => {
    it('lets a matched pattern force full content over a global compress', () => {
      expect(
        resolveFileLevel('src/index.ts', { compress: true, patterns: [{ pattern: 'src/**/*', compress: false }] }),
      ).toBe('full');
    });

    it('gives directoryStructureOnly precedence over compress when both are set', () => {
      expect(
        resolveFileLevel('website/index.html', {
          compress: false,
          patterns: [{ pattern: 'website/**/*', compress: true, directoryStructureOnly: true }],
        }),
      ).toBe('directory-only');
    });
  });

  describe('path matching', () => {
    it('matches nested files under a ** glob', () => {
      expect(
        resolveFileLevel('docs/sub/deep/guide.md', {
          compress: false,
          patterns: [{ pattern: 'docs/**/*', compress: true }],
        }),
      ).toBe('compress');
    });

    it('matches Windows-style backslash paths against forward-slash globs', () => {
      expect(
        resolveFileLevel('docs\\sub\\guide.md', {
          compress: false,
          patterns: [{ pattern: 'docs/**/*', compress: true }],
        }),
      ).toBe('compress');
    });

    it('matches dotfiles (dot: true)', () => {
      expect(
        resolveFileLevel('.github/workflows/ci.yml', {
          compress: false,
          patterns: [{ pattern: '.github/**/*', directoryStructureOnly: true }],
        }),
      ).toBe('directory-only');
    });
  });
});
