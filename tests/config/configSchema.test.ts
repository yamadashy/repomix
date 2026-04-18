import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  repomixConfigBaseSchema,
  repomixConfigCliSchema,
  repomixConfigDefaultSchema,
  repomixConfigFileSchema,
  repomixConfigMergedSchema,
  repomixOutputStyleSchema,
} from '../../src/config/configSchema.js';

describe('configSchema', () => {
  describe('repomixOutputStyleSchema', () => {
    it('should accept valid output styles', () => {
      expect(repomixOutputStyleSchema.parse('plain')).toBe('plain');
      expect(repomixOutputStyleSchema.parse('xml')).toBe('xml');
    });

    it('should reject invalid output styles', () => {
      expect(() => repomixOutputStyleSchema.parse('invalid')).toThrow(z.ZodError);
    });
  });

  describe('tokenCountTree option', () => {
    it('should accept boolean values for tokenCountTree', () => {
      const configWithBooleanTrue = {
        output: {
          tokenCountTree: true,
        },
      };
      const configWithBooleanFalse = {
        output: {
          tokenCountTree: false,
        },
      };
      expect(repomixConfigBaseSchema.parse(configWithBooleanTrue)).toEqual(configWithBooleanTrue);
      expect(repomixConfigBaseSchema.parse(configWithBooleanFalse)).toEqual(configWithBooleanFalse);
    });

    it('should accept string values for tokenCountTree', () => {
      const configWithString = {
        output: {
          tokenCountTree: '100',
        },
      };
      expect(repomixConfigBaseSchema.parse(configWithString)).toEqual(configWithString);
    });

    it('should reject invalid types for tokenCountTree', () => {
      const configWithInvalidType = {
        output: {
          tokenCountTree: [], // Should be boolean, number, or string
        },
      };
      expect(() => repomixConfigBaseSchema.parse(configWithInvalidType)).toThrow(z.ZodError);
    });
  });

  describe('repomixConfigBaseSchema', () => {
    it('should accept valid base config', () => {
      const validConfig = {
        output: {
          filePath: 'output.txt',
          style: 'plain',
          removeComments: true,
          tokenCountTree: true,
        },
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          customPatterns: ['node_modules'],
        },
        security: {
          enableSecurityCheck: true,
        },
      };
      expect(repomixConfigBaseSchema.parse(validConfig)).toEqual(validConfig);
    });

    it('should accept empty object', () => {
      expect(repomixConfigBaseSchema.parse({})).toEqual({});
    });

    it('should reject invalid types', () => {
      const invalidConfig = {
        output: {
          filePath: 123, // Should be string
          style: 'invalid', // Should be 'plain' or 'xml'
        },
        include: 'not-an-array', // Should be an array
      };
      expect(() => repomixConfigBaseSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });
  });

  describe('repomixConfigDefaultSchema', () => {
    it('should accept valid default config', () => {
      const validConfig = {
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: 'output.txt',
          style: 'plain',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          files: true,
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          topFilesLength: 5,
          showLineNumbers: false,
          truncateBase64: true,
          copyToClipboard: true,
          includeFullDirectoryStructure: false,
          tokenCountTree: '100',
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
            includeLogs: false,
            includeLogsCount: 50,
          },
        },
        include: [],
        ignore: {
          useGitignore: true,
          useDotIgnore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      };
      expect(repomixConfigDefaultSchema.parse(validConfig)).toEqual(validConfig);
    });

    it('should reject incomplete config', () => {
      const invalidConfig = {};
      expect(() => repomixConfigDefaultSchema.parse(invalidConfig)).toThrow();
    });

    it('should provide helpful error for missing required fields', () => {
      const invalidConfig = {};
      expect(() => repomixConfigDefaultSchema.parse(invalidConfig)).toThrow(/expected object/i);
    });
  });

  describe('repomixConfigFileSchema', () => {
    it('should accept valid file config', () => {
      const validConfig = {
        output: {
          filePath: 'custom-output.txt',
          style: 'xml',
        },
        ignore: {
          customPatterns: ['*.log'],
        },
      };
      expect(repomixConfigFileSchema.parse(validConfig)).toEqual(validConfig);
    });

    it('should accept partial config', () => {
      const partialConfig = {
        output: {
          filePath: 'partial-output.txt',
        },
      };
      expect(repomixConfigFileSchema.parse(partialConfig)).toEqual(partialConfig);
    });
  });

  describe('repomixConfigCliSchema', () => {
    it('should accept valid CLI config', () => {
      const validConfig = {
        output: {
          filePath: 'cli-output.txt',
          showLineNumbers: true,
        },
        include: ['src/**/*.ts'],
      };
      expect(repomixConfigCliSchema.parse(validConfig)).toEqual(validConfig);
    });

    it('should reject invalid CLI options', () => {
      const invalidConfig = {
        output: {
          filePath: 123, // Should be string
        },
      };
      expect(() => repomixConfigCliSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });
  });

  describe('repomixConfigMergedSchema', () => {
    it('should accept valid merged config', () => {
      const validConfig = {
        cwd: '/path/to/project',
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: 'merged-output.txt',
          style: 'plain',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          files: true,
          removeComments: true,
          removeEmptyLines: false,
          compress: false,
          topFilesLength: 10,
          showLineNumbers: true,
          truncateBase64: true,
          copyToClipboard: false,
          includeFullDirectoryStructure: false,
          tokenCountTree: false,
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
            includeLogs: false,
            includeLogsCount: 50,
          },
        },
        include: ['**/*.js', '**/*.ts'],
        ignore: {
          useGitignore: true,
          useDotIgnore: true,
          useDefaultPatterns: true,
          customPatterns: ['*.log'],
        },
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      };
      expect(repomixConfigMergedSchema.parse(validConfig)).toEqual(validConfig);
    });

    it('should reject merged config missing required fields', () => {
      const invalidConfig = {
        output: {
          filePath: 'output.txt',
          // Missing required fields
        },
      };
      expect(() => repomixConfigMergedSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });

    it('should reject merged config with invalid types', () => {
      const invalidConfig = {
        cwd: '/path/to/project',
        output: {
          filePath: 'output.txt',
          style: 'plain',
          removeComments: 'not-a-boolean', // Should be boolean
          removeEmptyLines: false,
          compress: false,
          topFilesLength: '5', // Should be number
          showLineNumbers: false,
        },
        include: ['**/*.js'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
        },
        security: {
          enableSecurityCheck: true,
        },
      };
      expect(() => repomixConfigMergedSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });
  });

  // Drift-detection: when the CLI hot path skips merge-time validation
  // (`mergeConfigs(..., { validate: false })`), file-level validation must
  // catch the same shape errors. This is only true if base schema and merged
  // schema share the same constraints for the constrained fields. Both
  // schemas derive their constraints from `fieldSchemas` in configSchema.ts,
  // so this test asserts the wiring is intact for every field listed there.
  // If a future schema gains a new constrained field but only one of the two
  // schemas is updated, this test fails.
  describe('shared constraints (file vs merged schema)', () => {
    type InvalidCase = { path: string; invalid: unknown; description: string };
    const invalidCases: InvalidCase[] = [
      { path: 'input.maxFileSize', invalid: 0, description: 'maxFileSize must be >= 1' },
      { path: 'output.topFilesLength', invalid: -1, description: 'topFilesLength must be >= 0' },
      { path: 'output.splitOutput', invalid: 0, description: 'splitOutput must be >= 1' },
      {
        path: 'output.git.sortByChangesMaxCommits',
        invalid: 0,
        description: 'sortByChangesMaxCommits must be >= 1',
      },
      { path: 'output.git.includeLogsCount', invalid: 0, description: 'includeLogsCount must be >= 1' },
      { path: 'output.style', invalid: 'bogus', description: 'style must be a valid OUTPUT_STYLES enum value' },
      {
        path: 'tokenCount.encoding',
        invalid: 'bogus-encoding',
        description: 'encoding must be a valid TOKEN_ENCODINGS enum value',
      },
    ];

    // Build a nested object from a dot-separated path and a leaf value.
    // setPath('output.git.includeLogsCount', 0) -> { output: { git: { includeLogsCount: 0 } } }
    const setPath = (path: string, value: unknown): Record<string, unknown> => {
      const segments = path.split('.');
      const root: Record<string, unknown> = {};
      let cursor = root;
      for (let i = 0; i < segments.length - 1; i += 1) {
        const next: Record<string, unknown> = {};
        cursor[segments[i]] = next;
        cursor = next;
      }
      cursor[segments[segments.length - 1]] = value;
      return root;
    };

    for (const { path, invalid, description } of invalidCases) {
      it(`base schema and merged schema both reject ${description} (${path})`, () => {
        const config = setPath(path, invalid);
        // The merged schema needs `cwd`; merge it in for that schema only.
        const mergedConfig = { ...config, cwd: '/tmp' };
        expect(() => repomixConfigBaseSchema.parse(config), 'base schema should reject').toThrow(z.ZodError);
        expect(() => repomixConfigMergedSchema.parse(mergedConfig), 'merged schema should reject').toThrow(z.ZodError);
      });
    }
  });
});
