import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { RepomixConfigValidationError, rethrowValidationErrorIfSchemaError } from '../../src/shared/errorHandle.js';

describe('rethrowValidationErrorIfSchemaError', () => {
  it('rethrows ValiError as RepomixConfigValidationError with formatted message', () => {
    const schema = v.object({ foo: v.string() });
    let caught: unknown;
    try {
      v.parse(schema, { foo: 42 });
    } catch (error) {
      caught = error;
    }

    expect(() => rethrowValidationErrorIfSchemaError(caught, 'Invalid config')).toThrow(RepomixConfigValidationError);
    try {
      rethrowValidationErrorIfSchemaError(caught, 'Invalid config');
    } catch (error) {
      expect(error).toBeInstanceOf(RepomixConfigValidationError);
      expect((error as Error).message).toContain('Invalid config');
      // Valibot path segments are { key } objects — the helper should unwrap them.
      expect((error as Error).message).toContain('[foo]');
    }
  });

  it('rethrows ZodError-shaped duck-typed errors as RepomixConfigValidationError', () => {
    const zodLike = {
      name: 'ZodError',
      message: 'Validation failed',
      issues: [{ path: ['output', 'style'], message: 'Invalid enum value' }],
    };

    expect(() => rethrowValidationErrorIfSchemaError(zodLike, 'Invalid cli arguments')).toThrow(
      RepomixConfigValidationError,
    );
    try {
      rethrowValidationErrorIfSchemaError(zodLike, 'Invalid cli arguments');
    } catch (error) {
      expect((error as Error).message).toContain('[output.style]');
      expect((error as Error).message).toContain('Invalid enum value');
    }
  });

  it('handles serialized ValiError across worker boundaries (no instanceof Error)', () => {
    // Simulate a structured-clone copy — no Error prototype, plain object.
    const workerError = {
      name: 'ValiError',
      message: 'Invalid type',
      issues: [{ path: [{ key: 'input' }, { key: 'maxFileSize' }], message: 'Invalid type' }],
    };

    expect(() => rethrowValidationErrorIfSchemaError(workerError, 'Invalid config')).toThrow(
      RepomixConfigValidationError,
    );
  });

  it('does nothing for non-schema errors', () => {
    expect(() => rethrowValidationErrorIfSchemaError(new Error('boom'), 'msg')).not.toThrow();
    expect(() => rethrowValidationErrorIfSchemaError(null, 'msg')).not.toThrow();
    expect(() => rethrowValidationErrorIfSchemaError('string', 'msg')).not.toThrow();
    expect(() => rethrowValidationErrorIfSchemaError({ name: 'Other', issues: [] }, 'msg')).not.toThrow();
  });

  it('filters out empty path segments so the joined path stays clean', () => {
    // A malformed path item (object without `key`) should drop out instead of
    // producing a double-dot like `[output..style]`.
    const malformed = {
      name: 'ValiError',
      message: 'Invalid type',
      issues: [
        {
          path: [{ key: 'output' }, { type: 'object' }, { key: 'style' }],
          message: 'Invalid type',
        },
      ],
    };

    try {
      rethrowValidationErrorIfSchemaError(malformed, 'Invalid config');
      expect.fail('Expected RepomixConfigValidationError to be thrown');
    } catch (error) {
      expect((error as Error).message).toContain('[output.style]');
      expect((error as Error).message).not.toContain('..');
    }
  });

  it('omits the bracketed path when a schema issue has no path', () => {
    // Root-level issues carry no path; the formatted message should read as
    // `message` rather than `[] message`.
    const rootIssue = {
      name: 'ValiError',
      message: 'Root-level failure',
      issues: [{ path: [] as unknown[], message: 'Expected object' }],
    };

    try {
      rethrowValidationErrorIfSchemaError(rootIssue, 'Invalid config');
      expect.fail('Expected RepomixConfigValidationError to be thrown');
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).toContain('Expected object');
      expect(msg).not.toContain('[]');
    }
  });
});
