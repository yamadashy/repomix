import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadFileConfig } from '../../src/config/configLoad.js';

describe('configLoad Integration Tests', () => {
  const fixturesDir = path.join(process.cwd(), 'tests/fixtures/config-js');

  describe('JavaScript Config Files', () => {
    test('should load .js config with ESM default export', async () => {
      const config = await loadFileConfig(fixturesDir, 'repomix.config.js');

      expect(config).toEqual({
        output: {
          filePath: 'esm-output.xml',
          style: 'xml',
          removeComments: true,
        },
        ignore: {
          customPatterns: ['**/node_modules/**', '**/dist/**'],
        },
      });
    });

    test('should load .mjs config', async () => {
      const config = await loadFileConfig(fixturesDir, 'repomix.config.mjs');

      expect(config).toEqual({
        output: {
          filePath: 'mjs-output.xml',
          style: 'xml',
        },
        ignore: {
          customPatterns: ['**/test/**'],
        },
      });
    });

    test('should load .cjs config with module.exports', async () => {
      const config = await loadFileConfig(fixturesDir, 'repomix.config.cjs');

      expect(config).toEqual({
        output: {
          filePath: 'cjs-output.xml',
          style: 'plain',
        },
        ignore: {
          customPatterns: ['**/build/**'],
        },
      });
    });

    test('should handle dynamic values in JS config', async () => {
      const config = await loadFileConfig(fixturesDir, 'repomix-dynamic.config.js');

      expect(config.output?.filePath).toMatch(/^output-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xml$/);
      expect(config.output?.style).toBe('xml');
      expect(config.ignore?.customPatterns).toEqual(['**/node_modules/**']);
    });
  });
});
