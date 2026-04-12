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

  // Regression coverage for the standalone-pattern fast-path skip:
  // `truncateBase64Content` short-circuits the expensive standalone regex
  // when no run of 256+ base64-alphabet characters exists in the content.
  // The cases below exercise both branches of that pre-scan.
  describe('standalone fast-path skip', () => {
    it('should skip standalone replace when no 256-char base64 run exists', () => {
      // Many short base64-like tokens separated by non-base64 chars (newlines,
      // spaces, hyphens). Each run is well under 256 chars, so the standalone
      // pattern can never match.
      const noisyContent = `${'aB1+/aB1+/'.repeat(20)}\n${'-'.repeat(50)}\n${'cD2+/cD2+/'.repeat(20)}`;
      const input = `const fragments = "${noisyContent}";`;
      const result = truncateBase64Content(input);
      expect(result).toBe(input);
    });

    it('should still detect a base64 run that is broken into the middle of long files', () => {
      // Filler with no base64 chars, then a 300-char real base64 run, then more filler.
      // The fast-path scanner must reset its run counter on the filler section
      // and re-detect the run after it.
      const filler = '\n# section\n  /// a comment with no encodable run /// \n'.repeat(50);
      const input = `${filler}const data = "${longBase64}";\n${filler}`;
      const result = truncateBase64Content(input);
      expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
      expect(result).not.toContain(longBase64);
    });

    it('should treat exactly 255 base64 chars as below threshold (no truncation)', () => {
      // 255 base64 chars sits one character below the standalone threshold.
      // The fast-path scanner should NOT trip, and the content must round-trip.
      const justUnder = longBase64.substring(0, 255);
      const input = `const data = "${justUnder}";`;
      const result = truncateBase64Content(input);
      expect(result).toBe(input);
    });

    it('should trip on a run of exactly 256 base64 chars (lower-bound of fast-path)', () => {
      // Exactly 256 base64 chars exercises the lower bound of the pre-scan
      // (`runLength >= MIN_BASE64_LENGTH_STANDALONE`). The fast-path scanner
      // must enter the slow path and the regex must truncate.
      const exact256 = longBase64.substring(0, 256);
      const input = `const data = "${exact256}";`;
      const result = truncateBase64Content(input);
      expect(result).toBe('const data = "DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...";');
    });

    it('should still apply data URI truncation even when standalone fast-path skips', () => {
      // A short data URI alone — its base64 payload is 88 chars (well under 256),
      // so the standalone pre-scan returns false. The data URI replace must
      // still run regardless of the standalone skip.
      const input =
        'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==);';
      const result = truncateBase64Content(input);
      expect(result).toBe('background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...);');
    });
  });
});
