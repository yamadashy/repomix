import { describe, expect, it } from 'vitest';
import { splitPatterns } from '../../src/shared/patternUtils.js';

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
});
