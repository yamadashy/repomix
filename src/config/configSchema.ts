import { z } from 'zod';
import { TOKEN_ENCODINGS } from '../core/metrics/TokenCounter.js';
import { defaultFilePathMap, OUTPUT_STYLES } from './configDefaults.js';

// Re-export for backward compatibility (callers used to import from configSchema).
export type { RepomixOutputStyle } from './configDefaults.js';
export { defaultFilePathMap };

// Output style enum
export const repomixOutputStyleSchema = z.enum(OUTPUT_STYLES);

// ---------------------------------------------------------------------------
// Field schemas (single source of truth for constraints)
//
// Each entry returns a fresh zod schema with the field's type + range + enum
// constraint. The base (file) schema wraps these with `.optional()` and the
// default (merged) schema wraps them with `.default(X)` — so the underlying
// `int().min(N)` / `enum(...)` rules live in exactly one place. Changing
// `min(1)` to `min(2)` here automatically applies to both schemas.
//
// `tests/config/configSchema.test.ts` asserts that the file schema and merged
// schema reject the same set of invalid values for these fields, catching
// drift if a future field is added without going through this object.
// ---------------------------------------------------------------------------
export const fieldSchemas = {
  maxFileSize: () => z.number().int().min(1),
  topFilesLength: () => z.number().int().min(0),
  splitOutput: () => z.number().int().min(1),
  sortByChangesMaxCommits: () => z.number().int().min(1),
  includeLogsCount: () => z.number().int().min(1),
  encoding: () => z.enum(TOKEN_ENCODINGS),
  style: () => repomixOutputStyleSchema,
  tokenCountTree: () => z.union([z.boolean(), z.number(), z.string()]),
} as const;

// Base config schema (used for file-level validation).
//
// Constraints are derived from `fieldSchemas` so the rules stay in sync with
// `repomixConfigDefaultSchema`. Required because the CLI hot path skips
// merge-time validation via `mergeConfigs(..., { validate: false })`, so file
// validation must catch what merge validation would have caught.
export const repomixConfigBaseSchema = z.object({
  $schema: z.string().optional(),
  input: z
    .object({
      maxFileSize: fieldSchemas.maxFileSize().optional(),
    })
    .optional(),
  output: z
    .object({
      filePath: z.string().optional(),
      style: fieldSchemas.style().optional(),
      parsableStyle: z.boolean().optional(),
      headerText: z.string().optional(),
      instructionFilePath: z.string().optional(),
      fileSummary: z.boolean().optional(),
      directoryStructure: z.boolean().optional(),
      files: z.boolean().optional(),
      removeComments: z.boolean().optional(),
      removeEmptyLines: z.boolean().optional(),
      compress: z.boolean().optional(),
      topFilesLength: fieldSchemas.topFilesLength().optional(),
      showLineNumbers: z.boolean().optional(),
      truncateBase64: z.boolean().optional(),
      copyToClipboard: z.boolean().optional(),
      includeEmptyDirectories: z.boolean().optional(),
      includeFullDirectoryStructure: z.boolean().optional(),
      splitOutput: fieldSchemas.splitOutput().optional(),
      tokenCountTree: fieldSchemas.tokenCountTree().optional(),
      git: z
        .object({
          sortByChanges: z.boolean().optional(),
          sortByChangesMaxCommits: fieldSchemas.sortByChangesMaxCommits().optional(),
          includeDiffs: z.boolean().optional(),
          includeLogs: z.boolean().optional(),
          includeLogsCount: fieldSchemas.includeLogsCount().optional(),
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
      encoding: fieldSchemas.encoding().optional(),
    })
    .optional(),
});

// Default config schema with default values.
//
// The constrained fields (numeric ranges, enums) come from `fieldSchemas` —
// see the comment on `fieldSchemas` for the rationale.
export const repomixConfigDefaultSchema = z.object({
  input: z.object({
    maxFileSize: fieldSchemas.maxFileSize().default(50 * 1024 * 1024), // Default: 50MB
  }),
  output: z.object({
    filePath: z.string().default(defaultFilePathMap.xml),
    style: fieldSchemas.style().default('xml'),
    parsableStyle: z.boolean().default(false),
    headerText: z.string().optional(),
    instructionFilePath: z.string().optional(),
    fileSummary: z.boolean().default(true),
    directoryStructure: z.boolean().default(true),
    files: z.boolean().default(true),
    removeComments: z.boolean().default(false),
    removeEmptyLines: z.boolean().default(false),
    compress: z.boolean().default(false),
    topFilesLength: fieldSchemas.topFilesLength().default(5),
    showLineNumbers: z.boolean().default(false),
    truncateBase64: z.boolean().default(false),
    copyToClipboard: z.boolean().default(false),
    includeEmptyDirectories: z.boolean().optional(),
    includeFullDirectoryStructure: z.boolean().default(false),
    splitOutput: fieldSchemas.splitOutput().optional(),
    tokenCountTree: fieldSchemas.tokenCountTree().default(false),
    git: z.object({
      sortByChanges: z.boolean().default(true),
      sortByChangesMaxCommits: fieldSchemas.sortByChangesMaxCommits().default(100),
      includeDiffs: z.boolean().default(false),
      includeLogs: z.boolean().default(false),
      includeLogsCount: fieldSchemas.includeLogsCount().default(50),
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
    encoding: fieldSchemas.encoding().default('o200k_base'),
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

// defaultConfig is defined in configDefaults.ts as a plain object (no zod
// runtime). Re-exported here for backward compatibility.
export { defaultConfig } from './configDefaults.js';

// Helper function for type-safe config definition
export const defineConfig = (config: RepomixConfigFile): RepomixConfigFile => config;
