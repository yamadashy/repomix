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

  it('should handle empty input', () => {
    expect(truncateBase64Content('')).toBe('');
  });

  it('should preserve base64-like runs of exactly 255 chars (just below threshold)', () => {
    // One char below MIN_BASE64_LENGTH_STANDALONE — `hasLongBase64Run` precondition
    // must return false so the regex is skipped and content is untouched.
    const just255 = longBase64.slice(0, 255);
    const input = `const data = "${just255}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should preserve content where no single base64 run reaches the threshold', () => {
    // Two 200-char base64-like runs separated by a non-base64 char (`=` is only
    // valid as trailing padding, not inside the run). Neither run hits 256, so
    // the regex must not match and the precondition must reset on the separator.
    const run = longBase64.slice(0, 200);
    const input = `${run} = ${run}`;
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should not truncate a base64-like run split across a newline', () => {
    // A 320-char base64 body interrupted by a newline: neither line segment
    // reaches 256, and `\n` resets the run, so nothing should be truncated.
    // Guards the line-scoped scan in `hasLongBase64Run`, which only inspects
    // lines that individually reach the threshold.
    const half = longBase64.slice(0, 160);
    const input = `const data = "${half}\n${half}";`;
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  it('should truncate a long base64 run that follows many short lines', () => {
    // Many short lines (each < 256) precede the real run; the line-scoped scan
    // must skip them and still reach the long final line to truncate.
    const shortLines = 'const a = 1;\n'.repeat(50);
    const input = `${shortLines}const data = "${longBase64}";`;
    const result = truncateBase64Content(input);
    expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
    expect(result.startsWith(shortLines)).toBe(true);
  });

  it('should truncate a base64 run on a long line that follows another long non-base64 line', () => {
    // The scan in `hasLongBase64Run` is line-scoped: it only character-scans
    // lines that reach the length threshold. An earlier long line that is NOT a
    // base64 run (here a 300-char run of '-', which resets the counter every
    // char) must not cause the scanner to stop — the real run on the following
    // long line still has to be detected and truncated.
    const longDashes = '-'.repeat(300);
    const input = `${longDashes}\nconst data = "${longBase64}";`;
    const result = truncateBase64Content(input);
    expect(result).toContain(longDashes);
    expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
  });

  it('should truncate a base64 run on a CRLF-terminated line', () => {
    // The `\r` before `\n` is also non-base64; the long line must still be
    // detected by the line-scoped scan and truncated.
    const input = `const data = "${longBase64}";\r\nconst next = 2;\r\n`;
    const result = truncateBase64Content(input);
    expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
    expect(result).toContain('const next = 2;');
  });

  it('should truncate a long base64 run with no newline at all', () => {
    // Single-line content (no `\n`): the line-scoped scan treats the whole
    // string as one segment and scans it directly.
    const input = `prefix-${longBase64}-suffix`;
    const result = truncateBase64Content(input);
    expect(result).toContain('DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtg...');
  });

  it('should leave non-base64 data URIs untouched', () => {
    // `data:text/plain,hello` has no `;base64,` literal, so the dataUriPattern
    // cannot match. Verifies the `includes(';base64,')` guard short-circuits
    // correctly without accidentally rewriting plain data URIs.
    const input = 'const url = "data:text/plain;charset=utf-8,Hello%20World";';
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });
});
