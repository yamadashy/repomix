import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { classifyRejectReason, getRepoHost } from '../../../website/server/src/actions/packEventSchema.js';
import { packRequestSchema } from '../../../website/server/src/actions/packRequestSchema.js';
import { validateRequest } from '../../../website/server/src/utils/validation.js';

// Exercise each rejection path through the real schema + validateRequest so
// that if a zod message in packRequestSchema changes, the classifier falling
// back to `'other'` fails the test in CI rather than quietly mislabeling a
// dashboard bucket in production.
describe('classifyRejectReason', () => {
  const baseOptions = {
    removeComments: false,
    removeEmptyLines: false,
    showLineNumbers: false,
    fileSummary: false,
    directoryStructure: false,
    outputParsable: false,
    compress: false,
  };

  const expectRejectReason = (input: unknown, expected: string) => {
    let caught: unknown;
    try {
      validateRequest(packRequestSchema, input);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(classifyRejectReason(caught)).toBe(expected);
  };

  test('missing_input — neither url nor file', () => {
    expectRejectReason({ format: 'xml', options: baseOptions }, 'missing_input');
  });

  test('invalid_url — URL fails isValidRemoteValue refine', () => {
    expectRejectReason({ url: 'not-a-repo', format: 'xml', options: baseOptions }, 'invalid_url');
  });

  test('url_too_long — URL exceeds 200 chars', () => {
    const longUrl = `https://github.com/${'a'.repeat(201)}`;
    expectRejectReason({ url: longUrl, format: 'xml', options: baseOptions }, 'url_too_long');
  });

  test('url_empty — URL is empty string', () => {
    expectRejectReason({ url: '', format: 'xml', options: baseOptions }, 'url_empty');
  });

  test('invalid_format — format not in enum', () => {
    expectRejectReason({ url: 'yamadashy/repomix', format: 'json', options: baseOptions }, 'invalid_format');
  });

  test('invalid_ignore_chars — ignorePatterns fails regex', () => {
    expectRejectReason(
      {
        url: 'yamadashy/repomix',
        format: 'xml',
        options: { ...baseOptions, ignorePatterns: 'evil;rm -rf' },
      },
      'invalid_ignore_chars',
    );
  });

  test('include_too_long — includePatterns exceeds 100_000 chars', () => {
    expectRejectReason(
      {
        url: 'yamadashy/repomix',
        format: 'xml',
        options: { ...baseOptions, includePatterns: 'a'.repeat(100_001) },
      },
      'include_too_long',
    );
  });

  test('ignore_too_long — ignorePatterns exceeds 1_000 chars', () => {
    expectRejectReason(
      {
        url: 'yamadashy/repomix',
        format: 'xml',
        options: { ...baseOptions, ignorePatterns: 'a'.repeat(1_001) },
      },
      'ignore_too_long',
    );
  });

  test('unknown — non-error input', () => {
    expect(classifyRejectReason(null)).toBe('unknown');
    expect(classifyRejectReason(undefined)).toBe('unknown');
    expect(classifyRejectReason('string error')).toBe('unknown');
  });

  test('unknown — ZodError with empty issues', () => {
    const empty = new z.ZodError([]);
    expect(classifyRejectReason(empty)).toBe('unknown');
  });

  test('cause-chain extraction — issues live on error.cause', () => {
    // validateRequest wraps ZodError in AppError with cause, so the classifier
    // must read .cause to find the original issues.
    let caught: unknown;
    try {
      validateRequest(packRequestSchema, { format: 'xml', options: baseOptions });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).cause).toBeInstanceOf(z.ZodError);
    expect(classifyRejectReason(caught)).toBe('missing_input');
  });
});

describe('getRepoHost', () => {
  test('file upload', () => {
    expect(getRepoHost({ file: {} as unknown })).toBe('upload');
  });

  test('github URL', () => {
    expect(getRepoHost({ url: 'https://github.com/yamadashy/repomix' })).toBe('github.com');
  });

  test('gitlab URL', () => {
    expect(getRepoHost({ url: 'https://gitlab.com/user/repo' })).toBe('gitlab.com');
  });

  test('shorthand owner/repo → github.com fallback', () => {
    expect(getRepoHost({ url: 'yamadashy/repomix' })).toBe('github.com');
  });

  test('neither url nor file', () => {
    expect(getRepoHost({})).toBe('unknown');
  });
});
