import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadFileConfig } from '../../src/config/configLoad.js';

describe('configLoad Integration Tests', () => {
  const jsFixturesDir = path.join(process.cwd(), 'tests/fixtures/config-js');
  const tsFixturesDir = path.join(process.cwd(), 'tests/fixtures/config-ts');

  describe('TypeScript Config Files', () => {
    test('should load .ts config with ESM default export', async () => {
      const config = await loadFileConfig(tsFixturesDir, 'repomix.config.ts');

      expect(config).toEqual({
        output: {
          filePath: 'ts-output.xml',
          style: 'xml',
          removeComments: true,
        },
        ignore: {
          customPatterns: ['**/node_modules/**', '**/dist/**'],
        },
      });
    });

    test('should load .mts config', async () => {
      const config = await loadFileConfig(tsFixturesDir, 'repomix.config.mts');

      expect(config).toEqual({
        output: {
          filePath: 'mts-output.xml',
          style: 'xml',
        },
        ignore: {
          customPatterns: ['**/test/**'],
        },
      });
    });

    test('should load .cts config', async () => {
      const config = await loadFileConfig(tsFixturesDir, 'repomix.config.cts');

      expect(config).toEqual({
        output: {
          filePath: 'cts-output.xml',
          style: 'plain',
        },
        ignore: {
          customPatterns: ['**/build/**'],
        },
      });
    });

    test('should handle dynamic values in TypeScript config', async () => {
      // Mock c12Load to avoid coverage instability caused by dynamic module loading.
      // This ensures deterministic test results while verifying config validation.
      const config = await loadFileConfig(tsFixturesDir, 'repomix-dynamic.config.ts', {}, {
        c12Load: async (options) => ({
          config: {
            output: {
              filePath: 'output-test-2024-01-01T00-00-00.xml',
              style: 'xml',
            },
            ignore: {
              customPatterns: ['**/node_modules/**'],
            },
          },
          configFile: path.resolve(options.cwd ?? '', options.configFile ?? ''),
          _configFile: path.resolve(options.cwd ?? '', options.configFile ?? ''),
          layers: [],
          cwd: options.cwd,
        }),
      } as Parameters<typeof loadFileConfig>[3]);

      expect(config.output?.filePath).toBe('output-test-2024-01-01T00-00-00.xml');
      expect(config.output?.style).toBe('xml');
      expect(config.ignore?.customPatterns).toEqual(['**/node_modules/**']);
    });
  });

  describe('JavaScript Config Files', () => {
    test('should load .js config with ESM default export', async () => {
      const config = await loadFileConfig(jsFixturesDir, 'repomix.config.js');

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
      const config = await loadFileConfig(jsFixturesDir, 'repomix.config.mjs');

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
      const config = await loadFileConfig(jsFixturesDir, 'repomix.config.cjs');

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
      // Mock c12Load to avoid coverage instability caused by dynamic module loading.
      // This ensures deterministic test results while verifying config validation.
      const config = await loadFileConfig(jsFixturesDir, 'repomix-dynamic.config.js', {}, {
        c12Load: async (options: { cwd: string; configFile: string }) => ({
          config: {
            output: {
              filePath: 'output-2024-01-01T00-00-00.xml',
              style: 'xml',
            },
            ignore: {
              customPatterns: ['**/node_modules/**'],
            },
          },
          configFile: path.resolve(options.cwd, options.configFile),
          _configFile: path.resolve(options.cwd, options.configFile),
          layers: [],
          cwd: options.cwd,
        }),
      } as Parameters<typeof loadFileConfig>[3]);

      expect(config.output?.filePath).toBe('output-2024-01-01T00-00-00.xml');
      expect(config.output?.style).toBe('xml');
      expect(config.ignore?.customPatterns).toEqual(['**/node_modules/**']);
    });
  });

  describe('Discovery Integration', () => {
    test('should not fall back to discovered .config files for a missing explicit config path', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-config-'));

      try {
        await fs.mkdir(path.join(tempDir, '.config'), { recursive: true });
        await fs.writeFile(
          path.join(tempDir, '.config', 'repomix.json'),
          JSON.stringify({ output: { filePath: 'fallback-output.xml', style: 'xml' } }),
        );

        await expect(loadFileConfig(tempDir, 'missing.json')).rejects.toThrow('Config file not found at missing.json');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should discover TOML config in .config directory with the full filename', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repomix-config-'));

      try {
        await fs.mkdir(path.join(tempDir, '.config'), { recursive: true });
        await fs.writeFile(
          path.join(tempDir, '.config', 'repomix.config.toml'),
          [
            '[output]',
            'filePath = "toml-output.xml"',
            'style = "xml"',
            '',
            '[ignore]',
            'customPatterns = ["**/tmp/**"]',
            '',
          ].join('\n'),
        );

        const config = await loadFileConfig(tempDir, null);

        expect(config).toEqual({
          output: {
            filePath: 'toml-output.xml',
            style: 'xml',
          },
          ignore: {
            customPatterns: ['**/tmp/**'],
          },
        });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
