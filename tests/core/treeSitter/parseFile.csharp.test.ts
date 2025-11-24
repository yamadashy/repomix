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

  test('should parse class inheritance', async () => {
    const fileContent = `
      // Base class
      public class BaseClass {
        public virtual void Method() { }
      }

      // Derived class
      public class DerivedClass : BaseClass {
        public override void Method() { }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['Base class', 'Derived class', 'class BaseClass', 'class DerivedClass', 'void Method()'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse interface implementation', async () => {
    const fileContent = `
      // Interface definition
      public interface IExample {
        void DoSomething();
      }

      // Implementation
      public class ExampleImpl : IExample {
        public void DoSomething() {
          Console.WriteLine("Doing something");
        }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Interface definition',
      'Implementation',
      'interface IExample',
      'class ExampleImpl',
      'void DoSomething()',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse generics without constraints', async () => {
    const fileContent = `
      // Generic class
      public class GenericClass<T> {
        public T Value { get; set; }
      }

      // Multiple type parameters
      public class MultiGeneric<T, U> {
        public T First { get; set; }
        public U Second { get; set; }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['Generic class', 'Multiple type parameters', 'class GenericClass', 'class MultiGeneric'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse generics with constraints', async () => {
    const fileContent = `
      // Generic with class constraint
      public class GenericClass<T> where T : class {
        public T Value { get; set; }
      }

      // Multiple constraints
      public class MultiConstraint<T, U>
        where T : IComparable<T>
        where U : new() {

        public void Method<V>(V item) where V : struct {
          Console.WriteLine(item);
        }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    // Should at least parse the classes and methods
    const expectContents = [
      'Generic with class constraint',
      'Multiple constraints',
      'class GenericClass',
      'class MultiConstraint',
      'void Method',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse properties and methods', async () => {
    const fileContent = `
      // Class with properties
      public class Person {
        // Name property
        public string Name { get; set; }

        // Age property
        public int Age { get; set; }

        // Method
        public void Greet() {
          Console.WriteLine("Hello");
        }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      'Class with properties',
      'Name property',
      'Age property',
      'Method',
      'class Person',
      'void Greet()',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });

  test('should parse nested classes', async () => {
    const fileContent = `
      // Outer class
      public class OuterClass {
        // Inner class
        public class InnerClass {
          public void InnerMethod() { }
        }
      }
    `;
    const filePath = 'dummy.cs';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = ['Outer class', 'Inner class', 'class OuterClass', 'class InnerClass', 'void InnerMethod()'];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
