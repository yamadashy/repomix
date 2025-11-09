import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../../tests/testing/testUtils.js';

describe('parseFile for C#', () => {
  test('should parse C# correctly', async () => {
    const fileContent = `
      // Program class containing the entry point
      /// <summary>
      /// The main program class
      /// </summary>
      class Program {
        // The main entry point
        /// <summary>
        /// Writes a greeting to the console
        /// </summary>
        static void Main() {
          Console.WriteLine("Hello, world!");
        }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '// Program class containing the entry point',
      '/// <summary>',
      'class Program {',
      '// The main program class',
      '// The main entry point',
      '/// Writes a greeting to the console',
      'static void Main() {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse C# generic constraints', async () => {
    const fileContent = `
      // Generic class with simple constraint
      class GenericClass<T> where T : IComparable {
        public void Method() { }
      }

      // Generic class with nullable constraint
      class NullableConstraint<T> where T : IComparable? {
        public void Method() { }
      }

      // Generic class with multiple constraints
      class MultipleConstraints<T> where T : class, IComparable {
        public void Method() { }
      }

      // Generic method with constraint
      void GenericMethod<T>() where T : IDisposable {
        // Method body
      }

      // Multiple type parameters with separate constraints
      class MultiParam<T, U> where T : IComparable where U : IDisposable {
        public void Method() { }
      }

      // Constructor constraint
      class ConstructorConstraint<T> where T : new() {
        public void Method() { }
      }

      // Struct constraint
      class StructConstraint<T> where T : struct {
        public void Method() { }
      }
    `;
    const filePath = 'generics.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '// Generic class with simple constraint',
      'class GenericClass<T> where T : IComparable {',
      '// Generic class with nullable constraint',
      'class NullableConstraint<T> where T : IComparable? {',
      '// Generic class with multiple constraints',
      'class MultipleConstraints<T> where T : class, IComparable {',
      '// Generic method with constraint',
      'void GenericMethod<T>() where T : IDisposable {',
      '// Multiple type parameters with separate constraints',
      'class MultiParam<T, U> where T : IComparable where U : IDisposable {',
      '// Constructor constraint',
      'class ConstructorConstraint<T> where T : new() {',
      '// Struct constraint',
      'class StructConstraint<T> where T : struct {',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
