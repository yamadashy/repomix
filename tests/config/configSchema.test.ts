import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
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
      expect(v.parse(repomixOutputStyleSchema, 'plain')).toBe('plain');
      expect(v.parse(repomixOutputStyleSchema, 'xml')).toBe('xml');
    });

    it('should reject invalid output styles', () => {
      expect(() => v.parse(repomixOutputStyleSchema, 'invalid')).toThrow(v.ValiError);
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
      expect(v.parse(repomixConfigBaseSchema, configWithBooleanTrue)).toEqual(configWithBooleanTrue);
      expect(v.parse(repomixConfigBaseSchema, configWithBooleanFalse)).toEqual(configWithBooleanFalse);
    });

    it('should accept string values for tokenCountTree', () => {
      const configWithString = {
        output: {
          tokenCountTree: '100',
        },
      };
      expect(v.parse(repomixConfigBaseSchema, configWithString)).toEqual(configWithString);
    });

    it('should reject invalid types for tokenCountTree', () => {
      const configWithInvalidType = {
        output: {
          tokenCountTree: [], // Should be boolean, number, or string
        },
      };
      expect(() => v.parse(repomixConfigBaseSchema, configWithInvalidType)).toThrow(v.ValiError);
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
      expect(v.parse(repomixConfigBaseSchema, validConfig)).toEqual(validConfig);
    });

    it('should accept empty object', () => {
      expect(v.parse(repomixConfigBaseSchema, {})).toEqual({});
    });

    it('should reject invalid types', () => {
      const invalidConfig = {
        output: {
          filePath: 123, // Should be string
          style: 'invalid', // Should be 'plain' or 'xml'
        },
        include: 'not-an-array', // Should be an array
      };
      expect(() => v.parse(repomixConfigBaseSchema, invalidConfig)).toThrow(v.ValiError);
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
      expect(v.parse(repomixConfigDefaultSchema, validConfig)).toEqual(validConfig);
    });

    it('should reject incomplete config', () => {
      const invalidConfig = {};
      expect(() => v.parse(repomixConfigDefaultSchema, invalidConfig)).toThrow(v.ValiError);
    });

    it('should provide helpful error for missing required fields', () => {
      const invalidConfig = {};
      try {
        v.parse(repomixConfigDefaultSchema, invalidConfig);
        expect.fail('Expected ValiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(v.ValiError);
        const valiError = error as v.ValiError<typeof repomixConfigDefaultSchema>;
        expect(valiError.issues[0].message).toMatch(/invalid (type|key)/i);
      }
    });

    describe('numeric constraint enforcement', () => {
      // The Valibot pipes (integer / minValue / maxValue) need behavioral coverage,
      // not just structural equivalence to the previous Zod schema.
      const baseDefaults = {
        input: { maxFileSize: 50 * 1024 * 1024 },
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          files: true,
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          topFilesLength: 5,
          showLineNumbers: false,
          truncateBase64: false,
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
        include: [] as string[],
        ignore: { useGitignore: true, useDotIgnore: true, useDefaultPatterns: true, customPatterns: [] as string[] },
        security: { enableSecurityCheck: true },
        tokenCount: { encoding: 'o200k_base' as const },
      };

      it('rejects non-integer maxFileSize', () => {
        const cfg = { ...baseDefaults, input: { maxFileSize: 1.5 } };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects maxFileSize below 1', () => {
        const cfg = { ...baseDefaults, input: { maxFileSize: 0 } };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects negative topFilesLength', () => {
        const cfg = { ...baseDefaults, output: { ...baseDefaults.output, topFilesLength: -1 } };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects splitOutput below 1', () => {
        const cfg = { ...baseDefaults, output: { ...baseDefaults.output, splitOutput: 0 } };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects non-integer splitOutput', () => {
        const cfg = { ...baseDefaults, output: { ...baseDefaults.output, splitOutput: 1.5 } };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects splitOutput above Number.MAX_SAFE_INTEGER', () => {
        const cfg = {
          ...baseDefaults,
          output: { ...baseDefaults.output, splitOutput: Number.MAX_SAFE_INTEGER + 1 },
        };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects sortByChangesMaxCommits below 1', () => {
        const cfg = {
          ...baseDefaults,
          output: {
            ...baseDefaults.output,
            git: { ...baseDefaults.output.git, sortByChangesMaxCommits: 0 },
          },
        };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects includeLogsCount below 1', () => {
        const cfg = {
          ...baseDefaults,
          output: {
            ...baseDefaults.output,
            git: { ...baseDefaults.output.git, includeLogsCount: 0 },
          },
        };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects non-integer topFilesLength', () => {
        const cfg = { ...baseDefaults, output: { ...baseDefaults.output, topFilesLength: 1.5 } };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects non-integer sortByChangesMaxCommits', () => {
        const cfg = {
          ...baseDefaults,
          output: {
            ...baseDefaults.output,
            git: { ...baseDefaults.output.git, sortByChangesMaxCommits: 1.5 },
          },
        };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });

      it('rejects non-integer includeLogsCount', () => {
        const cfg = {
          ...baseDefaults,
          output: {
            ...baseDefaults.output,
            git: { ...baseDefaults.output.git, includeLogsCount: 1.5 },
          },
        };
        expect(() => v.parse(repomixConfigDefaultSchema, cfg)).toThrow(v.ValiError);
      });
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
      expect(v.parse(repomixConfigFileSchema, validConfig)).toEqual(validConfig);
    });

    it('should accept partial config', () => {
      const partialConfig = {
        output: {
          filePath: 'partial-output.txt',
        },
      };
      expect(v.parse(repomixConfigFileSchema, partialConfig)).toEqual(partialConfig);
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
      expect(v.parse(repomixConfigCliSchema, validConfig)).toEqual(validConfig);
    });

    it('should reject invalid CLI options', () => {
      const invalidConfig = {
        output: {
          filePath: 123, // Should be string
        },
      };
      expect(() => v.parse(repomixConfigCliSchema, invalidConfig)).toThrow(v.ValiError);
    });

    it('should preserve base output fields alongside CLI-only stdout via intersect', () => {
      // `buildCliConfig` parses against this schema before mergeConfigs, so the
      // intersect must keep both the base-schema `filePath` and the CLI-only
      // `stdout`. The base schema's `output` does not declare `stdout`; valibot
      // would strip it without the intersect re-merging from the CLI member.
      const cliConfig = {
        output: { filePath: 'out.xml', stdout: true },
        skillGenerate: true,
      };
      const result = v.parse(repomixConfigCliSchema, cliConfig) as typeof cliConfig;
      expect(result.output.filePath).toBe('out.xml');
      expect(result.output.stdout).toBe(true);
      expect(result.skillGenerate).toBe(true);
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
      expect(v.parse(repomixConfigMergedSchema, validConfig)).toEqual(validConfig);
    });

    it('should reject merged config missing required fields', () => {
      const invalidConfig = {
        output: {
          filePath: 'output.txt',
          // Missing required fields
        },
      };
      expect(() => v.parse(repomixConfigMergedSchema, invalidConfig)).toThrow(v.ValiError);
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
      expect(() => v.parse(repomixConfigMergedSchema, invalidConfig)).toThrow(v.ValiError);
    });

    it('should preserve CLI-only fields (stdout, skillGenerate) through v.intersect', () => {
      // Regression guard: repomixConfigDefaultSchema's output is strict and does not
      // declare `stdout`; if intersect ever stopped merging per-schema outputs, the CLI
      // `--stdout` flag would silently disappear after mergeConfigs validates the result.
      const merged = {
        cwd: '/path/to/project',
        input: { maxFileSize: 1024 },
        output: {
          filePath: 'output.xml',
          style: 'xml',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          files: true,
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          topFilesLength: 5,
          showLineNumbers: false,
          truncateBase64: false,
          copyToClipboard: false,
          includeFullDirectoryStructure: false,
          tokenCountTree: false,
          stdout: true,
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
            includeLogs: false,
            includeLogsCount: 50,
          },
        },
        include: [],
        ignore: { useGitignore: true, useDotIgnore: true, useDefaultPatterns: true, customPatterns: [] },
        security: { enableSecurityCheck: true },
        tokenCount: { encoding: 'o200k_base' },
        skillGenerate: 'my-skill',
      };
      const result = v.parse(repomixConfigMergedSchema, merged) as typeof merged;
      expect(result.output.stdout).toBe(true);
      expect(result.skillGenerate).toBe('my-skill');
    });
  });
});
