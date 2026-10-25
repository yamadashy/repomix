import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../src/actions/packRequestMessages.js';
import { packRequestSchema } from '../src/actions/packRequestSchema.js';
import { getMaxBraceDepth, MAX_BRACE_DEPTH } from '../src/domains/pack/utils/validation.js';

describe('getMaxBraceDepth', () => {
  test.each([
    ['src/**/*.ts', 0],
    ['src/**/*.{ts,tsx}', 1],
    ['{src,lib}/**/*.{ts,tsx}', 1],
    ['src/{a,{b,c}}/*.ts', 2],
    ['{{{x}}}', 3],
    ['}}{x}', 1],
  ])('%s → %i', (pattern, expected) => {
    expect(getMaxBraceDepth(pattern)).toBe(expected);
  });
});

describe('packRequestSchema includePatterns brace depth', () => {
  const request = (includePatterns: string) => ({
    url: 'yamadashy/repomix',
    format: 'xml',
    options: { includePatterns },
  });

  test('accepts nesting up to the limit', () => {
    const pattern = `${'{a,'.repeat(MAX_BRACE_DEPTH)}b${'}'.repeat(MAX_BRACE_DEPTH)}`;
    expect(v.safeParse(packRequestSchema, request(pattern)).success).toBe(true);
  });

  test('rejects nesting beyond the limit', () => {
    const depth = MAX_BRACE_DEPTH + 1;
    const pattern = `${'{a,'.repeat(depth)}b${'}'.repeat(depth)}`;
    const result = v.safeParse(packRequestSchema, request(pattern));
    expect(result.success).toBe(false);
    expect(result.issues?.[0]?.message).toBe(MESSAGES.INCLUDE_TOO_NESTED);
  });
});
