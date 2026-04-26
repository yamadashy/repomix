import * as v from 'valibot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleError,
  OperationCancelledError,
  RepomixConfigValidationError,
  RepomixError,
  rethrowValidationErrorIfSchemaError,
} from '../../src/shared/errorHandle.js';
import { logger, repomixLogLevels } from '../../src/shared/logger.js';

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

describe('error classes', () => {
  it('RepomixError sets name and preserves cause', () => {
    const cause = new Error('underlying');
    const err = new RepomixError('boom', { cause });
    expect(err.name).toBe('RepomixError');
    expect(err.message).toBe('boom');
    expect(err.cause).toBe(cause);
  });

  it('RepomixConfigValidationError extends RepomixError', () => {
    const err = new RepomixConfigValidationError('invalid');
    expect(err).toBeInstanceOf(RepomixError);
    expect(err.name).toBe('RepomixConfigValidationError');
  });

  it('OperationCancelledError uses default message', () => {
    const err = new OperationCancelledError();
    expect(err).toBeInstanceOf(RepomixError);
    expect(err.name).toBe('OperationCancelledError');
    expect(err.message).toBe('Operation cancelled');
  });
});

describe('handleError', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let noteSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  const originalLevel = logger.getLogLevel();

  beforeEach(() => {
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    noteSpy = vi.spyOn(logger, 'note').mockImplementation(() => {});
    vi.spyOn(logger, 'log').mockImplementation(() => {});
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.setLogLevel(originalLevel);
  });

  it('handles RepomixError with verbose hint at non-debug level', () => {
    logger.setLogLevel(repomixLogLevels.INFO);
    const err = new RepomixError('config invalid');

    handleError(err);

    expect(errorSpy).toHaveBeenCalledWith('✖ config invalid');
    expect(noteSpy).toHaveBeenCalledWith(expect.stringContaining('--verbose'));
    expect(infoSpy).toHaveBeenCalledWith('Need help?');
  });

  it('handles RepomixError without verbose hint at debug level', () => {
    logger.setLogLevel(repomixLogLevels.DEBUG);
    const err = new RepomixError('config invalid');

    handleError(err);

    expect(errorSpy).toHaveBeenCalledWith('✖ config invalid');
    // Verbose hint is suppressed at DEBUG level
    expect(noteSpy).not.toHaveBeenCalledWith(expect.stringContaining('--verbose'));
  });

  it('logs cause when RepomixError has one', () => {
    logger.setLogLevel(repomixLogLevels.DEBUG);
    const cause = new Error('root cause');
    const err = new RepomixError('outer', { cause });

    handleError(err);

    expect(debugSpy).toHaveBeenCalledWith('Caused by:', cause);
  });

  it('handles unexpected (non-Repomix) Error with stack trace', () => {
    logger.setLogLevel(repomixLogLevels.INFO);
    const err = new Error('something broke');

    handleError(err);

    expect(errorSpy).toHaveBeenCalledWith('✖ Unexpected error: something broke');
    expect(noteSpy).toHaveBeenCalledWith('Stack trace:', err.stack);
    expect(noteSpy).toHaveBeenCalledWith(expect.stringContaining('--verbose'));
  });

  it('handles duck-typed Error from worker boundary', () => {
    logger.setLogLevel(repomixLogLevels.INFO);
    // Plain object that quacks like an Error (e.g. structured-clone copy)
    const workerError = { name: 'TypeError', message: 'invalid arg', stack: 'stack here' };

    handleError(workerError);

    expect(errorSpy).toHaveBeenCalledWith('✖ Unexpected error: invalid arg');
  });

  it('handles duck-typed RepomixError from worker boundary', () => {
    logger.setLogLevel(repomixLogLevels.INFO);
    const workerError = { name: 'RepomixError', message: 'pack failed' };

    handleError(workerError);

    expect(errorSpy).toHaveBeenCalledWith('✖ pack failed');
  });

  it('handles duck-typed RepomixConfigValidationError from worker boundary', () => {
    logger.setLogLevel(repomixLogLevels.INFO);
    const workerError = { name: 'RepomixConfigValidationError', message: 'bad config' };

    handleError(workerError);

    expect(errorSpy).toHaveBeenCalledWith('✖ bad config');
  });

  it('handles duck-typed OperationCancelledError from worker boundary', () => {
    // OperationCancelledError extends RepomixError. Without the name being
    // listed in isRepomixError's duck-typed comparison, a structured-clone
    // copy from a worker would fall into the "Unexpected error" branch
    // and surface a noisy stack trace for what is actually a user cancel.
    logger.setLogLevel(repomixLogLevels.INFO);
    const workerError = { name: 'OperationCancelledError', message: 'Operation cancelled' };

    handleError(workerError);

    expect(errorSpy).toHaveBeenCalledWith('✖ Operation cancelled');
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Unexpected error'));
  });

  it('handles unknown non-Error values via inspect()', () => {
    logger.setLogLevel(repomixLogLevels.INFO);

    handleError('a thrown string');

    expect(errorSpy).toHaveBeenCalledWith('✖ An unknown error occurred');
    expect(noteSpy).toHaveBeenCalledWith('Error details:', expect.stringContaining('a thrown string'));
  });

  it('handles null as unknown error', () => {
    logger.setLogLevel(repomixLogLevels.INFO);

    handleError(null);

    expect(errorSpy).toHaveBeenCalledWith('✖ An unknown error occurred');
  });
});
