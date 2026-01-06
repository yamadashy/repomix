import { describe, expect, it } from 'vitest';
import {
  PathSecurityError,
  sanitizeSubmoduleName,
  validatePathWithinRoot,
  validateProjectRoot,
  validateSubmodulePath,
} from '../../../src/mcp/security/pathValidator.js';

describe('pathValidator', () => {
  describe('validatePathWithinRoot', () => {
    it('should allow valid relative paths', () => {
      const result = validatePathWithinRoot('crates/foo', '/project');
      expect(result).toBe('/project/crates/foo');
    });

    it('should normalize paths with redundant segments', () => {
      const result = validatePathWithinRoot('crates/../crates/foo', '/project');
      expect(result).toBe('/project/crates/foo');
    });

    it('should reject paths that escape root with ../', () => {
      expect(() => {
        validatePathWithinRoot('../../../etc/passwd', '/project');
      }).toThrow(PathSecurityError);
    });

    it('should reject paths that start with ..', () => {
      expect(() => {
        validatePathWithinRoot('..', '/project');
      }).toThrow(PathSecurityError);
    });

    it('should allow deeply nested paths within root', () => {
      const result = validatePathWithinRoot('a/b/c/d/e/f', '/project');
      expect(result).toBe('/project/a/b/c/d/e/f');
    });
  });

  describe('validateProjectRoot', () => {
    it('should return cwd when no projectRoot provided', () => {
      const result = validateProjectRoot();
      expect(result).toBe(process.cwd());
    });

    it('should return cwd when undefined provided', () => {
      const result = validateProjectRoot(undefined);
      expect(result).toBe(process.cwd());
    });

    it('should normalize and resolve relative paths', () => {
      const result = validateProjectRoot('./subdir');
      expect(result).toContain('subdir');
      expect(result.startsWith('/')).toBe(true); // Should be absolute
    });
  });

  describe('sanitizeSubmoduleName', () => {
    it('should pass through valid names', () => {
      expect(sanitizeSubmoduleName('crate-foo')).toBe('crate-foo');
      expect(sanitizeSubmoduleName('crate_bar')).toBe('crate_bar');
      expect(sanitizeSubmoduleName('my.package')).toBe('my.package');
    });

    it('should replace path separators with hyphens', () => {
      expect(sanitizeSubmoduleName('crates/foo')).toBe('crates-foo');
      expect(sanitizeSubmoduleName('crates\\bar')).toBe('crates-bar');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeSubmoduleName('crate@foo#bar')).toBe('cratefoobar');
    });

    it('should collapse multiple dots', () => {
      expect(sanitizeSubmoduleName('name..test')).toBe('name.test');
    });

    it('should remove leading/trailing dots', () => {
      expect(sanitizeSubmoduleName('.hidden.')).toBe('hidden');
    });

    it('should throw for names with only invalid characters', () => {
      expect(() => {
        sanitizeSubmoduleName('@#$%');
      }).toThrow(PathSecurityError);
    });

    it('should throw for empty names', () => {
      expect(() => {
        sanitizeSubmoduleName('');
      }).toThrow(PathSecurityError);
    });

    it('should throw for names exceeding 255 characters', () => {
      const longName = 'a'.repeat(300);
      expect(() => {
        sanitizeSubmoduleName(longName);
      }).toThrow(PathSecurityError);
    });
  });

  describe('validateSubmodulePath', () => {
    it('should allow valid relative paths', () => {
      const result = validateSubmodulePath('crates/foo', '/project');
      expect(result).toBe('/project/crates/foo');
    });

    it('should reject absolute paths', () => {
      expect(() => {
        validateSubmodulePath('/etc/passwd', '/project');
      }).toThrow(PathSecurityError);
    });

    it('should reject paths with traversal', () => {
      expect(() => {
        validateSubmodulePath('../outside', '/project');
      }).toThrow(PathSecurityError);
    });

    it('should reject paths that eventually escape', () => {
      expect(() => {
        validateSubmodulePath('crates/../../outside', '/project');
      }).toThrow(PathSecurityError);
    });
  });
});
