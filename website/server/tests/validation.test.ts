import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { AppError } from '../src/utils/errorHandler.js';
import { validateRequest } from '../src/utils/validation.js';

// Covers the three distinct paths through validateRequest:
//   1. successful parse → returns typed output
//   2. ValiError → wrapped as AppError(400) with the original issues preserved
//      on `.cause` (the exact contract classifyRejectReason relies on)
//   3. anything else → re-thrown unchanged
//
// Tiny self-contained schemas keep the test focused — packRequestSchema's own
// behavior is covered indirectly through classifyRejectReason's drift tests.
describe('validateRequest', () => {
  const schema = v.pipe(
    v.strictObject({
      name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
      count: v.optional(v.number()),
    }),
    v.check((data) => data.count === undefined || data.count >= 0, 'Count must be non-negative'),
  );

  test('returns parsed output on valid input', () => {
    const result = validateRequest(schema, { name: 'pack', count: 3 });
    expect(result).toEqual({ name: 'pack', count: 3 });
  });

  test('wraps ValiError as AppError(400) and joins issue messages', () => {
    expect.assertions(4);
    try {
      validateRequest(schema, { name: '' });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.statusCode).toBe(400);
      expect(appError.message).toContain('Name is required');
      expect(appError.message.startsWith('Invalid request: ')).toBe(true);
    }
  });

  test('preserves original ValiError on `.cause` so classifyRejectReason can read `.issues`', () => {
    // Load-bearing contract: dropping `cause` here would silently break
    // pack_completed.rejectReason labeling in production.
    expect.assertions(2);
    try {
      validateRequest(schema, { name: '' });
    } catch (error) {
      const cause = (error as AppError).cause;
      expect(cause).toBeInstanceOf(v.ValiError);
      expect((cause as v.ValiError<typeof schema>).issues.length).toBeGreaterThan(0);
    }
  });

  test('top-level check issue (no path) renders message without a stray leading `": "`', () => {
    // `count: -1` fails the top-level v.check — valibot emits an issue with no
    // path. The rendered message must not start with `": "`.
    expect.assertions(2);
    try {
      validateRequest(schema, { name: 'pack', count: -1 });
    } catch (error) {
      const message = (error as AppError).message;
      expect(message).toContain('Count must be non-negative');
      // Anchor on the specific defect shape: `Invalid request: : <rest>` with
      // an empty path between the two colons. A plain `not.toContain(': : ')`
      // also works today, but the anchored regex documents the exact failure
      // mode we're guarding against.
      expect(message).not.toMatch(/^Invalid request: : /);
    }
  });

  test('re-throws non-ValiError unchanged', () => {
    // v.parse itself never throws non-ValiError, but a refine()-like callback
    // could raise. Simulate with a schema whose v.check callback throws.
    const exploding = v.pipe(
      v.string(),
      v.check(() => {
        throw new RangeError('unexpected boom');
      }, 'never reached'),
    );

    expect(() => validateRequest(exploding, 'anything')).toThrowError(RangeError);
  });
});
