import { describe, expect, test } from 'vitest';
import { CHUNK_SEPARATOR, parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('parseFile', () => {
  // Test for merging adjacent chunks
  test('should merge adjacent chunks', async () => {
    const fileContent = `
      /**
       * First function
       */
      function first() {
        console.log('first');
      }

      /**
       * Second function, right after first
       */
      function second() {
        console.log('second');
      }

      // Some space

      /**
       * Third function
       */
      function third() {
        console.log('third');
      }
    `;
    const filePath = 'dummy.js';
    const config = {};
    const result = await parseFile(fileContent, filePath, createMockConfig(config));
    expect(typeof result).toBe('string');

    expect(result).not.toBeUndefined();

    if (result) {
      const chunks = result.split(`\n${CHUNK_SEPARATOR}\n`);
      expect(chunks.length).toBe(4);

      expect(chunks[0]).toContain('* First function');
      expect(chunks[0]).toContain('function first()');
      expect(chunks[1]).toContain('* Second function');
      expect(chunks[1]).toContain('function second()');
      expect(chunks[2]).toContain('// Some space');
      expect(chunks[3]).toContain('* Third function');
      expect(chunks[3]).toContain('function third()');
    }
  });
});
