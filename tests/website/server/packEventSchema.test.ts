import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { classifyRejectReason, getRepoHost } from '../../../website/server/src/actions/packEventSchema.js';

// Classifier drift test. Messages below MUST match those defined in
// `website/server/src/actions/packRequestSchema.ts`. If a schema message is
// edited without updating this file, the classifier falls back to `'other'`
// and dashboards quietly mislabel — but that drift is not caught here
// (the test deliberately avoids importing the schema to keep this file's
// module graph free of server-only packages like `repomix` and `hono` that
// the root vitest harness doesn't install). For true schema drift catching,
// the schema and classifier would need to share a constants module.

// Construct a ZodError with a single issue whose message matches the one the
// schema would produce. classifyRejectReason only reads `.message` and
// `.path` from the first issue.
const zodErrorWith = (message: string, path: (string | number)[] = []) =>
  new z.ZodError([{ code: 'custom', message, path, input: undefined }]);

// Mimic the AppError-with-cause wrapping that `validateRequest` does in
// production — native Error with `cause` is enough to exercise the
// cause-chain path in classifyRejectReason, no AppError import needed.
const wrapped = (message: string, path: (string | number)[] = []) =>
  new Error(`Invalid request: ${message}`, { cause: zodErrorWith(message, path) });

describe('classifyRejectReason', () => {
  test.each([
    ['missing_input', 'Either URL or file must be provided'],
    ['both_provided', 'Cannot provide both URL and file'],
    ['invalid_url', 'Invalid repository URL'],
    ['url_too_long', 'Repository URL is too long'],
    ['url_empty', 'Repository URL is required'],
    ['invalid_file', 'Invalid file format'],
    ['not_zip', 'Only ZIP files are allowed'],
    ['file_too_large', 'File size must be less than 10MB'],
    ['invalid_ignore_chars', 'Invalid characters in ignore patterns'],
    ['include_too_long', 'Include patterns too long'],
    ['ignore_too_long', 'Ignore patterns too long'],
  ])('%s — classifies "%s"', (expected, message) => {
    expect(classifyRejectReason(zodErrorWith(message))).toBe(expected);
    // Wrapped via AppError.cause (the real production path)
    expect(classifyRejectReason(wrapped(message))).toBe(expected);
  });

  test('invalid_format — path "format" maps regardless of message text', () => {
    const err = zodErrorWith('any zod message', ['format']);
    expect(classifyRejectReason(err)).toBe('invalid_format');
  });

  test('other — unmapped message + unmapped path', () => {
    const err = zodErrorWith('some never-seen message', ['options', 'compress']);
    expect(classifyRejectReason(err)).toBe('other');
  });

  test('unknown — non-error input', () => {
    expect(classifyRejectReason(null)).toBe('unknown');
    expect(classifyRejectReason(undefined)).toBe('unknown');
    expect(classifyRejectReason('string error')).toBe('unknown');
  });

  test('unknown — ZodError with empty issues', () => {
    expect(classifyRejectReason(new z.ZodError([]))).toBe('unknown');
  });

  test('unknown — plain Error without issues', () => {
    expect(classifyRejectReason(new Error('bare error'))).toBe('unknown');
  });

  test('cause-chain extraction — issues live on error.cause (AppError path)', () => {
    const wrappedErr = wrapped('Either URL or file must be provided');
    expect(wrappedErr.cause).toBeInstanceOf(z.ZodError);
    expect(classifyRejectReason(wrappedErr)).toBe('missing_input');
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
