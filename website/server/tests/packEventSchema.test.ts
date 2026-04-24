import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { classifyRejectReason, getRepoHost } from '../src/actions/packEventSchema.js';
import { MESSAGES } from '../src/actions/packRequestMessages.js';

// Classifier drift test — imports MESSAGES from the same shared module that
// packRequestSchema uses. This means a message-text rewrite automatically
// propagates to the schema (producer), the classifier (consumer), AND the
// test's expected values, so schema/classifier drift is impossible by
// construction. The test's value is catching classifier-logic drift: if the
// classifier's MESSAGE_TO_REASON map loses a key (or maps it to the wrong
// label), the corresponding case here fails.

// Construct a minimal valibot-shaped issue. classifyRejectReason only reads
// `.message` and `.path` from the first issue, so a plain object is enough —
// instantiating v.ValiError here would require synthesizing a full BaseIssue
// (kind/type/input/expected/received) that the classifier never touches.
const schemaErrorWith = (message: string, path: readonly (string | number)[] = []) => ({
  name: 'ValiError',
  issues: [{ message, path: path.map((key) => ({ key })) }],
});

// Mimic the AppError-with-cause wrapping that `validateRequest` does in
// production — native Error with `cause` is enough to exercise the
// cause-chain path in classifyRejectReason.
const wrapped = (message: string, path: readonly (string | number)[] = []) =>
  new Error(`Invalid request: ${message}`, { cause: schemaErrorWith(message, path) });

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
    expect(classifyRejectReason(schemaErrorWith(message))).toBe(expected);
    // Wrapped via AppError.cause (the real production path)
    expect(classifyRejectReason(wrapped(message))).toBe(expected);
  });

  test('invalid_format — path "format" maps regardless of message text', () => {
    const err = schemaErrorWith('any schema message', ['format']);
    expect(classifyRejectReason(err)).toBe('invalid_format');
  });

  test('other — unmapped message + unmapped path', () => {
    const err = schemaErrorWith('some never-seen message', ['options', 'compress']);
    expect(classifyRejectReason(err)).toBe('other');
  });

  test('unknown — non-error input', () => {
    expect(classifyRejectReason(null)).toBe('unknown');
    expect(classifyRejectReason(undefined)).toBe('unknown');
    expect(classifyRejectReason('string error')).toBe('unknown');
  });

  test('unknown — schema error with empty issues', () => {
    expect(classifyRejectReason({ name: 'ValiError', issues: [] })).toBe('unknown');
  });

  test('unknown — plain Error without issues', () => {
    expect(classifyRejectReason(new Error('bare error'))).toBe('unknown');
  });

  test('cause-chain extraction — issues live on error.cause (AppError path)', () => {
    const wrappedErr = wrapped(MESSAGES.MISSING_INPUT);
    // Cause is the raw schema-error shape, carried through AppError wrapping.
    expect((wrappedErr.cause as { issues: unknown[] }).issues).toHaveLength(1);
    expect(classifyRejectReason(wrappedErr)).toBe('missing_input');
  });

  test('real valibot issues — guards against PathItem shape drift', () => {
    // The other tests in this file use a hand-rolled `schemaErrorWith` fixture.
    // That's fine for exercising classifier logic, but if valibot ever changes
    // its internal PathItem shape the fixture would silently lie — green tests,
    // red production. This test runs v.safeParse so the classifier sees a real
    // valibot-emitted issue; if the shape drifts, `v.getDotPath` here returns
    // something other than `'format'` and `invalid_format` bucketing breaks.
    const schema = v.object({ format: v.picklist(['xml', 'markdown']) });
    const result = v.safeParse(schema, { format: 'yaml' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(classifyRejectReason({ name: 'ValiError', issues: result.issues })).toBe('invalid_format');
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
