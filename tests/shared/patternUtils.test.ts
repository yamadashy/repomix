import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  escapeGlobMetacharacters,
  expandLiteralInclude,
  isPlainPathPattern,
  splitPatterns,
} from '../../src/shared/patternUtils.js';

describe('patternUtils', () => {
  describe('splitPatterns', () => {
    it('should correctly split patterns without braces', () => {
      const patterns = 'src/**,tests/**,*.js';
      const result = splitPatterns(patterns);
      expect(result).toEqual(['src/**', 'tests/**', '*.js']);
    });

    it('should preserve brace expansion patterns', () => {
      const patterns = 'src/**,**/{__tests__,theme}/**,*.{js,ts}';
      const result = splitPatterns(patterns);
      expect(result).toEqual(['src/**', '**/{__tests__,theme}/**', '*.{js,ts}']);
    });

    it('should handle nested braces', () => {
      const patterns = 'src/{components/{Button,Input},utils}/**';
      const result = splitPatterns(patterns);
      expect(result).toEqual(['src/{components/{Button,Input},utils}/**']);
    });

    it('should handle empty patterns', () => {
      expect(splitPatterns('')).toEqual([]);
      expect(splitPatterns(undefined)).toEqual([]);
    });

    it('should handle patterns with escaped braces', () => {
      const patterns = 'src/\\{file\\}.js,tests/**';
      const result = splitPatterns(patterns);
      // Note: Escaped braces are treated as regular characters, not brace delimiters
      expect(result).toEqual(['src/\\{file\\}.js', 'tests/**']);
    });

    it('should handle trailing commas', () => {
      const patterns = 'src/**,tests/**,';
      const result = splitPatterns(patterns);
      expect(result).toEqual(['src/**', 'tests/**']);
    });

    it('should handle leading commas', () => {
      const patterns = ',src/**,tests/**';
      const result = splitPatterns(patterns);
      expect(result).toEqual(['src/**', 'tests/**']);
    });

    it('should trim whitespace around patterns', () => {
      const patterns = ' src/** , tests/** , **/*.js ';
      const result = splitPatterns(patterns);
      expect(result).toEqual(['src/**', 'tests/**', '**/*.js']);
    });
  });

  describe('isPlainPathPattern', () => {
    it('should return true for literal paths with parentheses', () => {
      expect(isPlainPathPattern('src/app/(site)')).toBe(true);
      expect(isPlainPathPattern('src/app/(auth)/(settings)/page.tsx')).toBe(true);
      expect(isPlainPathPattern('src/(categories)/[id]')).toBe(true);
    });

    it('should return true for simple paths without glob metacharacters', () => {
      expect(isPlainPathPattern('src/components')).toBe(true);
      expect(isPlainPathPattern('tests/unit/file.test.ts')).toBe(true);
      expect(isPlainPathPattern('README.md')).toBe(true);
    });

    it('should return false for patterns with asterisks', () => {
      expect(isPlainPathPattern('src/**')).toBe(false);
      expect(isPlainPathPattern('src/**/*.ts')).toBe(false);
      expect(isPlainPathPattern('*.js')).toBe(false);
    });

    it('should return false for patterns with question marks', () => {
      expect(isPlainPathPattern('src/file?.ts')).toBe(false);
      expect(isPlainPathPattern('src/test?.tsx')).toBe(false);
    });

    it('should return false for patterns with braces', () => {
      expect(isPlainPathPattern('src/**/*.{ts,tsx}')).toBe(false);
      expect(isPlainPathPattern('**/{__tests__,tests}/**')).toBe(false);
    });

    it('should return false for patterns with square brackets', () => {
      expect(isPlainPathPattern('src/[a-z].ts')).toBe(false);
      expect(isPlainPathPattern('test[0-9].js')).toBe(false);
    });

    it('should return false for patterns with extglob characters', () => {
      expect(isPlainPathPattern('src/!(exclude)')).toBe(false);
      expect(isPlainPathPattern('src/+(pattern)')).toBe(false);
      expect(isPlainPathPattern('src/@(one|two)')).toBe(false);
    });

    it('should return false for patterns with glob alternation using parentheses', () => {
      expect(isPlainPathPattern('src/**/(page|layout).tsx')).toBe(false);
      expect(isPlainPathPattern('**/(index|main).{js,ts}')).toBe(false);
    });

    it('should return false for patterns with pipe character (alternation)', () => {
      expect(isPlainPathPattern('src/(page|layout).tsx')).toBe(false);
      expect(isPlainPathPattern('src/(auth|public)/page.tsx')).toBe(false);
      expect(isPlainPathPattern('src/foo|bar')).toBe(false); // rare but possible
    });
  });

  describe('escapeGlobMetacharacters', () => {
    it('should escape parentheses in paths', () => {
      expect(escapeGlobMetacharacters('src/(site)')).toBe('src/\\(site\\)');
      expect(escapeGlobMetacharacters('src/(auth)/(settings)')).toBe('src/\\(auth\\)/\\(settings\\)');
    });

    it('should escape square brackets in paths', () => {
      expect(escapeGlobMetacharacters('src/[id]')).toBe('src/\\[id\\]');
      expect(escapeGlobMetacharacters('src/[...slug]')).toBe('src/\\[\\.\\.\\.slug\\]');
    });

    it('should escape braces in paths', () => {
      expect(escapeGlobMetacharacters('src/{component}')).toBe('src/\\{component\\}');
    });

    it('should escape multiple special characters', () => {
      expect(escapeGlobMetacharacters('src/(auth)/[id]/{file}')).toBe('src/\\(auth\\)/\\[id\\]/\\{file\\}');
    });

    it('should normalize backslashes to forward slashes', () => {
      expect(escapeGlobMetacharacters('src\\(auth)\\page.tsx')).toBe('src/\\(auth\\)/page.tsx');
      expect(escapeGlobMetacharacters('src\\components\\Button')).toBe('src/components/Button');
    });

    it('should escape regex metacharacters', () => {
      expect(escapeGlobMetacharacters('src/file?.ts')).toBe('src/file\\?.ts');
      expect(escapeGlobMetacharacters('src/test*.tsx')).toBe('src/test\\*.tsx');
      expect(escapeGlobMetacharacters('src/file.test.ts')).toBe('src/file\\.test\\.ts');
    });

    it('should not escape forward slashes', () => {
      expect(escapeGlobMetacharacters('src/app/page.tsx')).toBe('src/app/page.tsx');
    });

    it('should handle empty strings', () => {
      expect(escapeGlobMetacharacters('')).toBe('');
    });
  });

  describe('expandLiteralInclude', () => {
    const testRootDir = '/test/root';

    beforeEach(() => {
      vi.spyOn(fs, 'existsSync');
      vi.spyOn(fs, 'statSync');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should expand directory to /**/* pattern', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      const result = expandLiteralInclude(testRootDir, 'src/app/(site)');
      expect(result).toEqual(['src/app/\\(site\\)/**/*']);
    });

    it('should handle directory with trailing slash', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      const result = expandLiteralInclude(testRootDir, 'src/app/(site)/');
      expect(result).toEqual(['src/app/\\(site\\)/**/*']);
    });

    it('should return escaped path for files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);

      const result = expandLiteralInclude(testRootDir, 'src/app/(site)/page.tsx');
      expect(result).toEqual(['src/app/\\(site\\)/page.tsx']);
    });

    it('should handle nested route groups', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      const result = expandLiteralInclude(testRootDir, 'src/app/(auth)/([id])');
      expect(result).toEqual(['src/app/\\(auth\\)/\\(\\[id\\]\\)/**/*']);
    });

    it('should return original pattern if path does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = expandLiteralInclude(testRootDir, 'src/nonexistent');
      expect(result).toEqual(['src/nonexistent']);
    });

    it('should handle fs errors gracefully', () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = expandLiteralInclude(testRootDir, 'src/restricted');
      expect(result).toEqual(['src/restricted']);
    });

    it('should escape special characters in file paths', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);

      const result = expandLiteralInclude(testRootDir, 'src/(auth)/[id]/page.tsx');
      expect(result).toEqual(['src/\\(auth\\)/\\[id\\]/page.tsx']);
    });

    it('should normalize Windows-style paths', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

      const result = expandLiteralInclude(testRootDir, 'src\\app\\(site)');
      expect(result).toEqual(['src/app/\\(site\\)/**/*']);
    });
  });
});
