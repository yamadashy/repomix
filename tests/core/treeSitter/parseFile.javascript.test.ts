import { describe, expect, test } from 'vitest';
import { CHUNK_SEPARATOR, parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile for JavaScript', () => {
  test('should filter captures with same start row', async () => {
    const fileContent = `
      /**
       * Greeting function
       * @param name The name to greet
       */
      function sayHello(name) {  // inline comment
        console.log("Hello, " + name);
      }

      // next function
      function sayGoodbye(name) {
        console.log("Goodbye, " + name);
      }
    `;
    const filePath = 'dummy.js';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');
    // Check content
    expect(result).toContain('/**\n       * Greeting function\n       * @param name The name to greet\n       */');
    expect(result).toContain('// inline comment');
    expect(result).not.toBeUndefined();
    if (result) {
      // Check separator
      const parts = result.split(`${CHUNK_SEPARATOR}\n`);
      expect(parts.length).toBeGreaterThan(1);
      for (const part of parts) {
        expect(part.trim()).not.toBe('');
      }
    }
  });

  test('should parse JSX correctly', async () => {
    const fileContent = `
      // React component function
      /**
       * A hello world component
       * @param {string} name - The name to display
       */
      function sayHello(name) { console.log("Hello, " + name); }
    `;
    const filePath = 'dummy.jsx';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    const expectContents = [
      '// React component function',
      '* A hello world component',
      '* @param {string} name - The name to display',
      'function sayHello(name)',
    ];

    for (const expectContent of expectContents) {
      expect(result).toContain(expectContent);
    }
  });
});
