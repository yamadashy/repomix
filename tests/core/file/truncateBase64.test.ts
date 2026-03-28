import { describe, expect, it } from 'vitest';
import { truncateBase64Content } from '../../../src/core/file/truncateBase64.js';

// A realistic long base64 string (344 chars) with digits, upper, lower, and special chars
const longBase64 =
  'DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOozfIXPGGGq9D1Gj9kia7T+B1CZ4yx1vsgRWqPtNn+I0htkrfcASZLcJW63wQpTnOYveIHLFF2m8DlCi9UeZ7D6A==';

describe('truncateBase64Content', () => {
  it('should truncate data URI base64 strings', () => {
    const input =
      'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==);';
    const result = truncateBase64Content(input);
    expect(result).toBe('background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...);');
  });

  it('should handle data URIs with charset parameter', () => {
    const input =
      'src="data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwMCIvPjwvc3ZnPg=="';
    const result = truncateBase64Content(input);
    expect(result).toBe('src="data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53..."');
  });

  it('should truncate standalone base64 strings longer than 256 chars', () => {
    const input = `const data = "${longBase64}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe('const data = "DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...";');
  });

  it('should truncate standalone base64 strings at exactly 256 chars', () => {
    // 192 bytes encodes to exactly 256 base64 chars with no padding
    const exact256 =
      'DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOo';
    const input = `const data = "${exact256}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe('const data = "DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...";');
  });

  it('should preserve short base64 strings', () => {
    const input = 'const shortData = "SGVsbG8gV29ybGQ=";';
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should not truncate non-base64 strings', () => {
    const input =
      'const longString = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ";';
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should not truncate path-like or XPath strings (no digits)', () => {
    // This was the false positive reported in #1298
    const xpath = 'postTransactionAmounts/sharesOwnedFollowingTransaction/value';
    const input = `const path = ".///${xpath}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should not truncate long path-like strings without digits', () => {
    // Even if somehow longer than 256 chars, path-like strings without digits should be preserved
    const longPath = 'abcdefghijklmnopqrstuvwxyz/ABCDEFGHIJKLMNOPQRSTUVWXYZ/'.repeat(6);
    const input = `const path = "${longPath}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should handle multiple base64 occurrences in same content', () => {
    const input = `
      const img1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      const img2 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
      const data = "${longBase64}";
    `;
    const result = truncateBase64Content(input);
    expect(result).toContain('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...');
    expect(result).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBD...');
    expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
  });

  it('should handle base64 with whitespace around it', () => {
    const input = `const data = \`\n  ${longBase64}\n\`;`;
    const result = truncateBase64Content(input);
    expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
  });

  it('should handle base64 strings with padding', () => {
    // longBase64 already ends with '==' padding
    const input = `const paddedData = "${longBase64}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe('const paddedData = "DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...";');
  });

  it('should produce consistent results on consecutive calls (regex lastIndex safety)', () => {
    const input = `const img = "data:image/png;base64,${longBase64}";`;
    const result1 = truncateBase64Content(input);
    const result2 = truncateBase64Content(input);
    expect(result1).toBe(result2);
  });

  it('should preserve medium-length base64-like strings under 256 chars', () => {
    // 60-char string that previously would have been truncated
    const mediumString = 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZy4=';
    const input = `const data = "${mediumString}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });
});
