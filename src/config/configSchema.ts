import * as v from 'valibot';
import { TOKEN_ENCODINGS } from '../core/metrics/TokenCounter.js';

// Output style enum
export const repomixOutputStyleSchema = v.picklist(['xml', 'markdown', 'json', 'plain']);
export type RepomixOutputStyle = v.InferOutput<typeof repomixOutputStyleSchema>;

// Default values map
export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  xml: 'repomix-output.xml',
  markdown: 'repomix-output.md',
  plain: 'repomix-output.txt',
  json: 'repomix-output.json',
} as const;

// Base config schema
export const repomixConfigBaseSchema = v.object({
  $schema: v.optional(v.string()),
  input: v.optional(
    v.object({
      maxFileSize: v.optional(v.number()),
    }),
  ),
  output: v.optional(
    v.object({
      filePath: v.optional(v.string()),
      style: v.optional(repomixOutputStyleSchema),
      parsableStyle: v.optional(v.boolean()),
      headerText: v.optional(v.string()),
      instructionFilePath: v.optional(v.string()),
      fileSummary: v.optional(v.boolean()),
      directoryStructure: v.optional(v.boolean()),
      files: v.optional(v.boolean()),
      removeComments: v.optional(v.boolean()),
      removeEmptyLines: v.optional(v.boolean()),
      compress: v.optional(v.boolean()),
      topFilesLength: v.optional(v.number()),
      showLineNumbers: v.optional(v.boolean()),
      truncateBase64: v.optional(v.boolean()),
      copyToClipboard: v.optional(v.boolean()),
      includeEmptyDirectories: v.optional(v.boolean()),
      includeFullDirectoryStructure: v.optional(v.boolean()),
      splitOutput: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER))),
      tokenCountTree: v.optional(v.union([v.boolean(), v.number(), v.string()])),
      git: v.optional(
        v.object({
          sortByChanges: v.optional(v.boolean()),
          sortByChangesMaxCommits: v.optional(v.number()),
          includeDiffs: v.optional(v.boolean()),
          includeLogs: v.optional(v.boolean()),
          includeLogsCount: v.optional(v.number()),
        }),
      ),
    }),
  ),
  include: v.optional(v.array(v.string())),
  ignore: v.optional(
    v.object({
      useGitignore: v.optional(v.boolean()),
      useDotIgnore: v.optional(v.boolean()),
      useDefaultPatterns: v.optional(v.boolean()),
      customPatterns: v.optional(v.array(v.string())),
    }),
  ),
  security: v.optional(
    v.object({
      enableSecurityCheck: v.optional(v.boolean()),
    }),
  ),
  tokenCount: v.optional(
    v.object({
      encoding: v.optional(v.string()),
    }),
  ),
});

// Default config schema with default values
export const repomixConfigDefaultSchema = v.object({
  input: v.object({
    maxFileSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 50 * 1024 * 1024), // Default: 50MB
  }),
  output: v.object({
    filePath: v.optional(v.string(), defaultFilePathMap.xml),
    style: v.optional(repomixOutputStyleSchema, 'xml'),
    parsableStyle: v.optional(v.boolean(), false),
    headerText: v.optional(v.string()),
    instructionFilePath: v.optional(v.string()),
    fileSummary: v.optional(v.boolean(), true),
    directoryStructure: v.optional(v.boolean(), true),
    files: v.optional(v.boolean(), true),
    removeComments: v.optional(v.boolean(), false),
    removeEmptyLines: v.optional(v.boolean(), false),
    compress: v.optional(v.boolean(), false),
    topFilesLength: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)), 5),
    showLineNumbers: v.optional(v.boolean(), false),
    truncateBase64: v.optional(v.boolean(), false),
    copyToClipboard: v.optional(v.boolean(), false),
    includeEmptyDirectories: v.optional(v.boolean()),
    includeFullDirectoryStructure: v.optional(v.boolean(), false),
    splitOutput: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER))),
    tokenCountTree: v.optional(v.union([v.boolean(), v.number(), v.string()]), false),
    git: v.object({
      sortByChanges: v.optional(v.boolean(), true),
      sortByChangesMaxCommits: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 100),
      includeDiffs: v.optional(v.boolean(), false),
      includeLogs: v.optional(v.boolean(), false),
      includeLogsCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 50),
    }),
  }),
  include: v.optional(v.array(v.string()), () => []),
  ignore: v.object({
    useGitignore: v.optional(v.boolean(), true),
    useDotIgnore: v.optional(v.boolean(), true),
    useDefaultPatterns: v.optional(v.boolean(), true),
    customPatterns: v.optional(v.array(v.string()), () => []),
  }),
  security: v.object({
    enableSecurityCheck: v.optional(v.boolean(), true),
  }),
  tokenCount: v.object({
    encoding: v.optional(v.picklist(TOKEN_ENCODINGS), 'o200k_base'),
  }),
});

// File-specific schema. Add options for file path and style
export const repomixConfigFileSchema = repomixConfigBaseSchema;

// CLI-specific schema. Add options for standard output mode and skill generation
export const repomixConfigCliSchema = v.intersect([
  repomixConfigBaseSchema,
  v.object({
    output: v.optional(
      v.object({
        stdout: v.optional(v.boolean()),
      }),
    ),
    skillGenerate: v.optional(v.union([v.string(), v.boolean()])),
  }),
]);

// Merged schema for all configurations.
// `v.intersect` is intentional: it layers the default schema (required fields
// with applied defaults) over the file and CLI schemas (all fields optional).
// Flattening to a single object via spread would silently demote the
// required-with-default fields to optional and change merge semantics.
export const repomixConfigMergedSchema = v.intersect([
  repomixConfigDefaultSchema,
  repomixConfigFileSchema,
  repomixConfigCliSchema,
  v.object({
    cwd: v.string(),
  }),
]);

export type RepomixConfigDefault = v.InferOutput<typeof repomixConfigDefaultSchema>;
export type RepomixConfigFile = v.InferOutput<typeof repomixConfigFileSchema>;
export type RepomixConfigCli = v.InferOutput<typeof repomixConfigCliSchema>;
export type RepomixConfigMerged = v.InferOutput<typeof repomixConfigMergedSchema>;

// Pass empty objects to let Valibot apply all default values.
// Explicit nested objects are required because we do not wrap the outer schema
// in v.optional with a default.
export const defaultConfig = v.parse(repomixConfigDefaultSchema, {
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
