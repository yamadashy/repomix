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

  it('should leave non-base64 data URIs untouched', () => {
    // `data:text/plain,hello` has no `;base64,` literal, so the dataUriPattern
    // cannot match. Verifies the `includes(';base64,')` guard short-circuits
    // correctly without accidentally rewriting plain data URIs.
    const input = 'const url = "data:text/plain;charset=utf-8,Hello%20World";';
    const result = truncateBase64Content(input);
    expect(result).toBe(input);
  });

  describe('sampled run detection (hasLongBase64Run precondition)', () => {
    // The precondition samples one character every 256 positions instead of
    // scanning every character. These cases pin the sampling-specific edges:
    // runs at arbitrary offsets, runs in the trailing partial window, and
    // sampling-phase resets after short-run expansions.

    it('should detect a qualifying run at every alignment relative to the sample stride', () => {
      // A 256-char run starting at offset k occupies [k, k+255], which must
      // contain a sample regardless of k. Exercise alignments around the
      // first two sample points (indices 255 and 511).
      for (const offset of [0, 1, 127, 254, 255, 256, 257, 300, 511]) {
        const input = `${'-'.repeat(offset)}${longBase64.slice(0, 256)}#tail`;
        const result = truncateBase64Content(input);
        expect(result, `offset ${offset}`).toContain('...');
      }
    });

    it('should detect a run that ends exactly at the end of content', () => {
      // The final partial window is shorter than the sampling stride; the
      // clamped last sample must still see this run.
      const input = `${'x '.repeat(150)}${longBase64.slice(0, 256)}`;
      const result = truncateBase64Content(input);
      expect(result).toContain('...');
    });

    it('should detect a run when the whole content is exactly one run of threshold length', () => {
      const input = longBase64.slice(0, 256);
      const result = truncateBase64Content(input);
      expect(result).toBe(`${longBase64.slice(0, 32)}...`);
    });

    it('should detect a qualifying run that follows many short runs', () => {
      // Every sample before the real run lands inside a short base64-like word,
      // forcing repeated expand-and-skip steps that reset the sampling phase.
      const shortWords = 'word1 path/to2 abc3 '.repeat(60); // 1200 chars of short runs
      const input = `${shortWords}${longBase64.slice(0, 256)} end`;
      const result = truncateBase64Content(input);
      expect(result).toContain('...');
    });

    it('should preserve content of many near-threshold runs separated by breaks', () => {
      // 250-char runs separated by a single newline give a 251-char period,
      // misaligned with the 256-char sampling stride: nearly every sample
      // lands inside a run, forcing a repeated expand-and-skip (phase reset)
      // that must measure each run as 250 < 256 and never match.
      const nearRun = longBase64.slice(0, 250);
      const input = Array.from({ length: 30 }, () => nearRun).join('\n');
      const result = truncateBase64Content(input);
      expect(result).toBe(input);
    });

    it('should match the per-character reference scan on randomized content', () => {
      // Differential check: the sampled precondition must agree with a
      // straightforward per-character reference on generated inputs.
      const referenceHasLongRun = (content: string): boolean => {
        let run = 0;
        for (let i = 0; i < content.length; i++) {
          if (/[A-Za-z0-9+/]/.test(content[i])) {
            run++;
            if (run >= 256) return true;
          } else {
            run = 0;
          }
        }
        return false;
      };
      // Deterministic LCG so failures are reproducible.
      let seed = 0x2f6e2b1;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const alphabet = 'Aa0+/ .,\n=-_';
      for (let trial = 0; trial < 500; trial++) {
        let s = '';
        const length = Math.floor(rand() * 700);
        for (let j = 0; j < length; j++) {
          s += alphabet[Math.floor(rand() * alphabet.length)];
        }
        let injectedQualifyingRun = false;
        if (rand() < 0.3) {
          const runLength = 200 + Math.floor(rand() * 120);
          const pos = Math.floor(rand() * (s.length + 1));
          // Repetitions of this diverse base64 prefix always pass isLikelyBase64.
          const run = longBase64
            .slice(0, 32)
            .repeat(Math.ceil(runLength / 32))
            .slice(0, runLength);
          s = s.slice(0, pos) + run + s.slice(pos);
          injectedQualifyingRun = runLength >= 256;
        }
        if (injectedQualifyingRun) {
          // False-negative direction: a diverse run of >= 256 chars exists, so
          // the sampled precondition must let the truncation happen.
          expect(truncateBase64Content(s), `trial ${trial}`).not.toBe(s);
        } else if (!referenceHasLongRun(s)) {
          // False-positive direction: no qualifying run anywhere, so content
          // must come back untouched.
          expect(truncateBase64Content(s), `trial ${trial}`).toBe(s);
        }
      }
    });
  });
});
