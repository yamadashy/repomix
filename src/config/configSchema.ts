import type { TiktokenEncoding } from 'tiktoken';
import { z } from 'zod';

// Output style enum
export const repomixOutputStyleSchema = z.enum(['xml', 'markdown', 'json', 'plain']);
export type RepomixOutputStyle = z.infer<typeof repomixOutputStyleSchema>;

// Default values map
export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  xml: 'repomix-output.xml',
  markdown: 'repomix-output.md',
  plain: 'repomix-output.txt',
  json: 'repomix-output.json',
} as const;

// Base config schema
export const repomixConfigBaseSchema = z.object({
  $schema: z.string().optional(),
  input: z
    .object({
      maxFileSize: z.number().optional(),
    })
    .optional(),
  output: z
    .object({
      filePath: z.string().optional(),
      style: repomixOutputStyleSchema.optional(),
      parsableStyle: z.boolean().optional(),
      headerText: z.string().optional(),
      instructionFilePath: z.string().optional(),
      fileSummary: z.boolean().optional(),
      directoryStructure: z.boolean().optional(),
      files: z.boolean().optional(),
      removeComments: z.boolean().optional(),
      removeEmptyLines: z.boolean().optional(),
      compress: z.boolean().optional(),
      topFilesLength: z.number().optional(),
      showLineNumbers: z.boolean().optional(),
      truncateBase64: z.boolean().optional(),
      copyToClipboard: z.boolean().optional(),
      includeEmptyDirectories: z.boolean().optional(),
      includeFullDirectoryStructure: z.boolean().optional(),
      splitOutput: z.number().int().min(1).optional(),
      tokenCountTree: z.union([z.boolean(), z.number(), z.string()]).optional(),
      git: z
        .object({
          sortByChanges: z.boolean().optional(),
          sortByChangesMaxCommits: z.number().optional(),
          includeDiffs: z.boolean().optional(),
          includeLogs: z.boolean().optional(),
          includeLogsCount: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  include: z.array(z.string()).optional(),
  ignore: z
    .object({
      useGitignore: z.boolean().optional(),
      useDotIgnore: z.boolean().optional(),
      useDefaultPatterns: z.boolean().optional(),
      customPatterns: z.array(z.string()).optional(),
    })
    .optional(),
  security: z
    .object({
      enableSecurityCheck: z.boolean().optional(),
    })
    .optional(),
  tokenCount: z
    .object({
      encoding: z.string().optional(),
    })
    .optional(),
});

// Default config schema with default values
export const repomixConfigDefaultSchema = z.object({
  input: z.object({
    maxFileSize: z
      .number()
      .int()
      .min(1)
      .default(50 * 1024 * 1024), // Default: 50MB
  }),
  output: z.object({
    filePath: z.string().default(defaultFilePathMap.xml),
    style: repomixOutputStyleSchema.default('xml'),
    parsableStyle: z.boolean().default(false),
    headerText: z.string().optional(),
    instructionFilePath: z.string().optional(),
    fileSummary: z.boolean().default(true),
    directoryStructure: z.boolean().default(true),
    files: z.boolean().default(true),
    removeComments: z.boolean().default(false),
    removeEmptyLines: z.boolean().default(false),
    compress: z.boolean().default(false),
    topFilesLength: z.number().int().min(0).default(5),
    showLineNumbers: z.boolean().default(false),
    truncateBase64: z.boolean().default(false),
    copyToClipboard: z.boolean().default(false),
    includeEmptyDirectories: z.boolean().optional(),
    includeFullDirectoryStructure: z.boolean().default(false),
    splitOutput: z.number().int().min(1).optional(),
    tokenCountTree: z.union([z.boolean(), z.number(), z.string()]).default(false),
    git: z.object({
      sortByChanges: z.boolean().default(true),
      sortByChangesMaxCommits: z.number().int().min(1).default(100),
      includeDiffs: z.boolean().default(false),
      includeLogs: z.boolean().default(false),
      includeLogsCount: z.number().int().min(1).default(50),
    }),
  }),
  include: z.array(z.string()).default([]),
  ignore: z.object({
    useGitignore: z.boolean().default(true),
    useDotIgnore: z.boolean().default(true),
    useDefaultPatterns: z.boolean().default(true),
    customPatterns: z.array(z.string()).default([]),
  }),
  security: z.object({
    enableSecurityCheck: z.boolean().default(true),
  }),
  tokenCount: z.object({
    encoding: z
      .string()
      .default('o200k_base')
      .transform((val) => val as TiktokenEncoding),
  }),
});

// File-specific schema. Add options for file path and style
export const repomixConfigFileSchema = repomixConfigBaseSchema;

// CLI-specific schema. Add options for standard output mode and skill generation
export const repomixConfigCliSchema = repomixConfigBaseSchema.and(
  z.object({
    output: z
      .object({
        stdout: z.boolean().optional(),
      })
      .optional(),
    skillGenerate: z.union([z.string(), z.boolean()]).optional(),
  }),
);

// Merged schema for all configurations
export const repomixConfigMergedSchema = repomixConfigDefaultSchema
  .and(repomixConfigFileSchema)
  .and(repomixConfigCliSchema)
  .and(
    z.object({
      cwd: z.string(),
    }),
  );

export type RepomixConfigDefault = z.infer<typeof repomixConfigDefaultSchema>;
export type RepomixConfigFile = z.infer<typeof repomixConfigFileSchema>;
export type RepomixConfigCli = z.infer<typeof repomixConfigCliSchema>;
export type RepomixConfigMerged = z.infer<typeof repomixConfigMergedSchema>;

// Pass empty objects to let Zod apply all default values
// Zod v4 requires explicit nested objects since we removed outer .default({})
export const defaultConfig = repomixConfigDefaultSchema.parse({
  input: {},
  output: {
    git: {},
  },
  ignore: {},
  security: {},
  tokenCount: {},
});

// Helper function for type-safe config definition
export const defineConfig = (config: RepomixConfigFile): RepomixConfigFile => config;
