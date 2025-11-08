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
});
