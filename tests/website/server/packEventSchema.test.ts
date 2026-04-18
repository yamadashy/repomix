import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { classifyRejectReason, getRepoHost } from '../../../website/server/src/actions/packEventSchema.js';
import { MESSAGES } from '../../../website/server/src/actions/packRequestMessages.js';

// Classifier drift test — imports MESSAGES from the same shared module that
// packRequestSchema uses. This means a message-text rewrite automatically
// propagates to the schema (producer), the classifier (consumer), AND the
// test's expected values, so schema/classifier drift is impossible by
// construction. The test's value is catching classifier-logic drift: if the
// classifier's MESSAGE_TO_REASON map loses a key (or maps it to the wrong
// label), the corresponding case here fails.
//
// Deliberately avoids importing packRequestSchema itself — that file
// transitively depends on `repomix`, which the root vitest harness can't
// resolve because repomix IS this repo.

// Construct a ZodError with a single issue whose message matches the shared
// constant. classifyRejectReason only reads `.message` and `.path` from the
// first issue.
const zodErrorWith = (message: string, path: (string | number)[] = []) =>
  new z.ZodError([{ code: 'custom', message, path, input: undefined }]);

// Mimic the AppError-with-cause wrapping that `validateRequest` does in
// production — native Error with `cause` is enough to exercise the
// cause-chain path in classifyRejectReason.
const wrapped = (message: string, path: (string | number)[] = []) =>
  new Error(`Invalid request: ${message}`, { cause: zodErrorWith(message, path) });

describe('classifyRejectReason', () => {
  test.each([
    ['missing_input', MESSAGES.MISSING_INPUT],
    ['both_provided', MESSAGES.BOTH_PROVIDED],
    ['invalid_url', MESSAGES.INVALID_URL],
    ['url_too_long', MESSAGES.URL_TOO_LONG],
    ['url_empty', MESSAGES.URL_REQUIRED],
    ['invalid_file', MESSAGES.INVALID_FILE],
    ['not_zip', MESSAGES.NOT_ZIP],
    ['file_too_large', MESSAGES.FILE_TOO_LARGE],
    ['invalid_ignore_chars', MESSAGES.INVALID_IGNORE_CHARS],
    ['include_too_long', MESSAGES.INCLUDE_TOO_LONG],
    ['ignore_too_long', MESSAGES.IGNORE_TOO_LONG],
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
