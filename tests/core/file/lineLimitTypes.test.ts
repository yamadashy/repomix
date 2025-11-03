import { describe, expect, test } from 'vitest';
import {
  LineLimitError,
  LineLimitTooSmallError,
  LineLimitParseError,
  LineSection,
} from '../../../src/core/file/lineLimitTypes.js';

describe('LineLimitTypes', () => {
  describe('LineSection', () => {
    test('should have correct enum values', () => {
      expect(LineSection.HEADER).toBe('header');
      expect(LineSection.CORE).toBe('core');
      expect(LineSection.FOOTER).toBe('footer');
    });

    test('should have three distinct values', () => {
      const values = Object.values(LineSection);
      expect(values).toHaveLength(3);
      expect(values).toContain('header');
      expect(values).toContain('core');
      expect(values).toContain('footer');
    });
  });

  describe('LineLimitError', () => {
    test('should create error with required properties', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const message = 'Test error message';

      const error = new LineLimitError(message, filePath, lineLimit);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LineLimitError);
      expect(error.name).toBe('LineLimitError');
      expect(error.message).toBe(message);
      expect(error.filePath).toBe(filePath);
      expect(error.lineLimit).toBe(lineLimit);
    });

    test('should accept optional cause', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const message = 'Test error message';
      const cause = new Error('Underlying cause');

      const error = new LineLimitError(message, filePath, lineLimit, cause);

      expect(error.cause).toBe(cause);
    });

    test('should handle missing cause', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const message = 'Test error message';

      const error = new LineLimitError(message, filePath, lineLimit);

      expect(error.cause).toBeUndefined();
    });

    test('should have proper stack trace', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const message = 'Test error message';

      const error = new LineLimitError(message, filePath, lineLimit);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    test('should be serializable', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const message = 'Test error message';
      const cause = new Error('Underlying cause');

      const error = new LineLimitError(message, filePath, lineLimit, cause);
      const serialized = JSON.parse(JSON.stringify(error));

      expect(serialized.name).toBe('LineLimitError');
      expect(serialized.message).toBe(message);
      expect(serialized.filePath).toBe(filePath);
      expect(serialized.lineLimit).toBe(lineLimit);
    });
  });

  describe('LineLimitTooSmallError', () => {
    test('should create error with specific message format', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 5;
      const minimumRequired = 10;

      const error = new LineLimitTooSmallError(filePath, lineLimit, minimumRequired);

      expect(error).toBeInstanceOf(LineLimitError);
      expect(error.name).toBe('LineLimitTooSmallError');
      expect(error.message).toContain(`Line limit ${lineLimit} is too small`);
      expect(error.message).toContain(filePath);
      expect(error.message).toContain(`Minimum required: ${minimumRequired}`);
      expect(error.filePath).toBe(filePath);
      expect(error.lineLimit).toBe(lineLimit);
    });

    test('should handle zero line limit', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 0;
      const minimumRequired = 5;

      const error = new LineLimitTooSmallError(filePath, lineLimit, minimumRequired);

      expect(error.message).toContain('Line limit 0 is too small');
      expect(error.lineLimit).toBe(0);
    });

    test('should handle negative line limit', () => {
      const filePath = '/test/file.ts';
      const lineLimit = -10;
      const minimumRequired = 5;

      const error = new LineLimitTooSmallError(filePath, lineLimit, minimumRequired);

      expect(error.message).toContain('Line limit -10 is too small');
      expect(error.lineLimit).toBe(-10);
    });

    test('should handle large minimum required', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const minimumRequired = 1000;

      const error = new LineLimitTooSmallError(filePath, lineLimit, minimumRequired);

      expect(error.message).toContain('Minimum required: 1000');
      expect(error.lineLimit).toBe(50);
    });
  });

  describe('LineLimitParseError', () => {
    test('should create error with specific message format', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const parseError = new Error('Syntax error: unexpected token');

      const error = new LineLimitParseError(filePath, lineLimit, parseError);

      expect(error).toBeInstanceOf(LineLimitError);
      expect(error.name).toBe('LineLimitParseError');
      expect(error.message).toContain(`Failed to parse file ${filePath} for line limiting`);
      expect(error.message).toContain(parseError.message);
      expect(error.filePath).toBe(filePath);
      expect(error.lineLimit).toBe(lineLimit);
      expect(error.cause).toBe(parseError);
    });

    test('should handle complex parse errors', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 100;
      const parseError = new Error('Unexpected token < at line 15, column 3');

      const error = new LineLimitParseError(filePath, lineLimit, parseError);

      expect(error.message).toContain('Unexpected token < at line 15, column 3');
      expect(error.cause).toBe(parseError);
    });

    test('should handle null/undefined parse error', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;

      // @ts-expect-error Testing with null
      const error1 = new LineLimitParseError(filePath, lineLimit, null);
      expect(error1.cause).toBeNull();

      // @ts-expect-error Testing with undefined
      const error2 = new LineLimitParseError(filePath, lineLimit, undefined);
      expect(error2.cause).toBeUndefined();
    });

    test('should handle parse error without message', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const parseError = new Error();

      const error = new LineLimitParseError(filePath, lineLimit, parseError);

      expect(error.message).toContain('Failed to parse file');
      expect(error.cause).toBe(parseError);
    });
  });

  describe('Error Inheritance', () => {
    test('LineLimitTooSmallError should inherit from LineLimitError', () => {
      const error = new LineLimitTooSmallError('/test/file.ts', 5, 10);

      expect(error).toBeInstanceOf(LineLimitError);
      expect(error).toBeInstanceOf(LineLimitTooSmallError);
      expect(error).toBeInstanceOf(Error);
    });

    test('LineLimitParseError should inherit from LineLimitError', () => {
      const parseError = new Error('Parse error');
      const error = new LineLimitParseError('/test/file.ts', 50, parseError);

      expect(error).toBeInstanceOf(LineLimitError);
      expect(error).toBeInstanceOf(LineLimitParseError);
      expect(error).toBeInstanceOf(Error);
    });

    test('should preserve error chain', () => {
      const originalError = new Error('Original error');
      const parseError = new LineLimitParseError('/test/file.ts', 50, originalError);

      expect(parseError.cause).toBe(originalError);
      expect(parseError.message).toContain(originalError.message);
    });
  });

  describe('Error Handling Patterns', () => {
    test('should work with try-catch blocks', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 5;
      const minimumRequired = 10;

      try {
        throw new LineLimitTooSmallError(filePath, lineLimit, minimumRequired);
      } catch (error) {
        expect(error).toBeInstanceOf(LineLimitTooSmallError);
        expect((error as LineLimitTooSmallError).filePath).toBe(filePath);
        expect((error as LineLimitTooSmallError).lineLimit).toBe(lineLimit);
      }
    });

    test('should work with instanceof checks', () => {
      const tooSmallError = new LineLimitTooSmallError('/test/file.ts', 5, 10);
      const parseError = new LineLimitParseError('/test/file.ts', 50, new Error('Parse error'));
      const generalError = new LineLimitError('General error', '/test/file.ts', 50);

      expect(tooSmallError instanceof LineLimitTooSmallError).toBe(true);
      expect(tooSmallError instanceof LineLimitError).toBe(true);
      expect(tooSmallError instanceof Error).toBe(true);

      expect(parseError instanceof LineLimitParseError).toBe(true);
      expect(parseError instanceof LineLimitError).toBe(true);
      expect(parseError instanceof Error).toBe(true);

      expect(generalError instanceof LineLimitError).toBe(true);
      expect(generalError instanceof Error).toBe(true);
      expect(generalError instanceof LineLimitTooSmallError).toBe(false);
      expect(generalError instanceof LineLimitParseError).toBe(false);
    });

    test('should handle error propagation', () => {
      const filePath = '/test/file.ts';
      const lineLimit = 50;
      const parseError = new Error('Deep parse error');

      function throwError(): never {
        throw new LineLimitParseError(filePath, lineLimit, parseError);
      }

      expect(() => throwError()).toThrow(LineLimitParseError);
      expect(() => throwError()).toThrow('Failed to parse file');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty file path', () => {
      const filePath = '';
      const lineLimit = 50;

      const error = new LineLimitError('Test error', filePath, lineLimit);

      expect(error.filePath).toBe('');
      expect(error.message).toContain('Test error');
    });

    test('should handle special characters in file path', () => {
      const filePath = '/path/with/特殊字符/file.ts';
      const lineLimit = 50;

      const error = new LineLimitError('Test error', filePath, lineLimit);

      expect(error.filePath).toBe(filePath);
      expect(error.message).toContain(filePath);
    });

    test('should handle very long file paths', () => {
      const filePath = '/very/long/path/' + 'a'.repeat(1000) + '/file.ts';
      const lineLimit = 50;

      const error = new LineLimitError('Test error', filePath, lineLimit);

      expect(error.filePath).toBe(filePath);
      expect(error.message).toContain(filePath);
    });

    test('should handle maximum line limits', () => {
      const filePath = '/test/file.ts';
      const lineLimit = Number.MAX_SAFE_INTEGER;

      const error = new LineLimitError('Test error', filePath, lineLimit);

      expect(error.lineLimit).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should handle minimum line limits', () => {
      const filePath = '/test/file.ts';
      const lineLimit = Number.MIN_SAFE_INTEGER;

      const error = new LineLimitError('Test error', filePath, lineLimit);

      expect(error.lineLimit).toBe(Number.MIN_SAFE_INTEGER);
    });
  });
});