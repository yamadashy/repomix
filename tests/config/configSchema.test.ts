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
      expect(() => v.parse(repomixConfigDefaultSchema, invalidConfig)).toThrow();
    });

    it('should provide helpful error for missing required fields', () => {
      const invalidConfig = {};
      expect(() => v.parse(repomixConfigDefaultSchema, invalidConfig)).toThrow(/expected|invalid/i);
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
  });
});
