import { createRequire } from 'node:module';
import type { TokenEncoding } from '../core/metrics/TokenCounter.js';
import { TOKEN_ENCODINGS } from '../core/metrics/TokenCounter.js';

// Output style enum
export type RepomixOutputStyle = 'xml' | 'markdown' | 'json' | 'plain';

// Default values map
export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  xml: 'repomix-output.xml',
  markdown: 'repomix-output.md',
  plain: 'repomix-output.txt',
  json: 'repomix-output.json',
} as const;

// ── Type definitions ────────────────────────────────────────────────
// Defined manually instead of using z.infer to avoid eagerly importing Zod
// at module load time (~52ms). Zod is only loaded when .parse() is called.

export interface RepomixConfigFile {
  $schema?: string;
  input?: {
    maxFileSize?: number;
  };
  output?: {
    filePath?: string;
    style?: RepomixOutputStyle;
    parsableStyle?: boolean;
    headerText?: string;
    instructionFilePath?: string;
    fileSummary?: boolean;
    directoryStructure?: boolean;
    files?: boolean;
    removeComments?: boolean;
    removeEmptyLines?: boolean;
    compress?: boolean;
    topFilesLength?: number;
    showLineNumbers?: boolean;
    truncateBase64?: boolean;
    copyToClipboard?: boolean;
    includeEmptyDirectories?: boolean;
    includeFullDirectoryStructure?: boolean;
    splitOutput?: number;
    tokenCountTree?: boolean | number | string;
    git?: {
      sortByChanges?: boolean;
      sortByChangesMaxCommits?: number;
      includeDiffs?: boolean;
      includeLogs?: boolean;
      includeLogsCount?: number;
    };
  };
  include?: string[];
  ignore?: {
    useGitignore?: boolean;
    useDotIgnore?: boolean;
    useDefaultPatterns?: boolean;
    customPatterns?: string[];
  };
  security?: {
    enableSecurityCheck?: boolean;
  };
  tokenCount?: {
    encoding?: string;
  };
}

export interface RepomixConfigCli extends RepomixConfigFile {
  output?: RepomixConfigFile['output'] & {
    stdout?: boolean;
  };
  skillGenerate?: string | boolean;
}

export interface RepomixConfigDefault {
  input: {
    maxFileSize: number;
  };
  output: {
    filePath: string;
    style: RepomixOutputStyle;
    parsableStyle: boolean;
    headerText?: string;
    instructionFilePath?: string;
    fileSummary: boolean;
    directoryStructure: boolean;
    files: boolean;
    removeComments: boolean;
    removeEmptyLines: boolean;
    compress: boolean;
    topFilesLength: number;
    showLineNumbers: boolean;
    truncateBase64: boolean;
    copyToClipboard: boolean;
    includeEmptyDirectories?: boolean;
    includeFullDirectoryStructure: boolean;
    splitOutput?: number;
    tokenCountTree: boolean | number | string;
    git: {
      sortByChanges: boolean;
      sortByChangesMaxCommits: number;
      includeDiffs: boolean;
      includeLogs: boolean;
      includeLogsCount: number;
    };
  };
  include: string[];
  ignore: {
    useGitignore: boolean;
    useDotIgnore: boolean;
    useDefaultPatterns: boolean;
    customPatterns: string[];
  };
  security: {
    enableSecurityCheck: boolean;
  };
  tokenCount: {
    encoding: TokenEncoding;
  };
}

export type RepomixConfigMerged = RepomixConfigDefault &
  RepomixConfigFile &
  RepomixConfigCli & {
    cwd: string;
  };

// ── Default config (plain object, no Zod) ───────────────────────────
// Equivalent to repomixConfigDefaultSchema.parse({...}) but avoids
// importing Zod (~33ms) and constructing schemas (~19ms) at module load.
export const defaultConfig: RepomixConfigDefault = {
  input: {
    maxFileSize: 50 * 1024 * 1024,
  },
  output: {
    filePath: defaultFilePathMap.xml,
    style: 'xml',
    parsableStyle: false,
    headerText: undefined,
    instructionFilePath: undefined,
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
    includeEmptyDirectories: undefined,
    includeFullDirectoryStructure: false,
    splitOutput: undefined,
    tokenCountTree: false,
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

// ── Lazy Zod schemas ────────────────────────────────────────────────
// Zod schemas are only needed for runtime validation (parse calls).
// Lazy initialization defers the ~52ms import+construction cost until
// the first parse() call, which happens during config loading.

let _zodSchemasLoaded = false;
// Use `any` for the lazy schema variables to avoid importing Zod types at module level.
// The schemas are fully typed via the getter return types when consumers call .parse().
// biome-ignore lint/suspicious/noExplicitAny: Zod types not available at module level
let _repomixOutputStyleSchema: any;
// biome-ignore lint/suspicious/noExplicitAny: Zod types not available at module level
let _repomixConfigBaseSchema: any;
// biome-ignore lint/suspicious/noExplicitAny: Zod types not available at module level
let _repomixConfigDefaultSchema: any;
// biome-ignore lint/suspicious/noExplicitAny: Zod types not available at module level
let _repomixConfigFileSchema: any;
// biome-ignore lint/suspicious/noExplicitAny: Zod types not available at module level
let _repomixConfigCliSchema: any;
// biome-ignore lint/suspicious/noExplicitAny: Zod types not available at module level
let _repomixConfigMergedSchema: any;

const ensureZodSchemas = () => {
  if (_zodSchemasLoaded) return;
  _zodSchemasLoaded = true;

  // Use createRequire for synchronous loading in ESM context.
  // Dynamic import() is async and can't be used here since .parse() callers
  // expect synchronous schema access after calling ensureZodSchemas().
  const esmRequire = createRequire(import.meta.url);
  const { z } = esmRequire('zod') as typeof import('zod');

  _repomixOutputStyleSchema = z.enum(['xml', 'markdown', 'json', 'plain']);

  _repomixConfigBaseSchema = z.object({
    $schema: z.string().optional(),
    input: z
      .object({
        maxFileSize: z.number().optional(),
      })
      .optional(),
    output: z
      .object({
        filePath: z.string().optional(),
        style: _repomixOutputStyleSchema.optional(),
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

  _repomixConfigDefaultSchema = z.object({
    input: z.object({
      maxFileSize: z
        .number()
        .int()
        .min(1)
        .default(50 * 1024 * 1024),
    }),
    output: z.object({
      filePath: z.string().default(defaultFilePathMap.xml),
      style: _repomixOutputStyleSchema.default('xml'),
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
      encoding: z.enum(TOKEN_ENCODINGS).default('o200k_base'),
    }),
  });

  _repomixConfigFileSchema = _repomixConfigBaseSchema;

  _repomixConfigCliSchema = _repomixConfigBaseSchema.and(
    z.object({
      output: z
        .object({
          stdout: z.boolean().optional(),
        })
        .optional(),
      skillGenerate: z.union([z.string(), z.boolean()]).optional(),
    }),
  );

  _repomixConfigMergedSchema = _repomixConfigDefaultSchema
    .and(_repomixConfigFileSchema)
    .and(_repomixConfigCliSchema)
    .and(
      z.object({
        cwd: z.string(),
      }),
    );
};

// Lazy accessors for Zod schemas - only trigger Zod import when actually used
// biome-ignore lint/suspicious/noExplicitAny: Zod schema type not available without importing Zod
export const getRepomixConfigFileSchema = (): any => {
  ensureZodSchemas();
  return _repomixConfigFileSchema;
};

// biome-ignore lint/suspicious/noExplicitAny: Zod schema type not available without importing Zod
export const getRepomixConfigCliSchema = (): any => {
  ensureZodSchemas();
  return _repomixConfigCliSchema;
};

// biome-ignore lint/suspicious/noExplicitAny: Zod schema type not available without importing Zod
export const getRepomixConfigMergedSchema = (): any => {
  ensureZodSchemas();
  return _repomixConfigMergedSchema;
};

// Lazy schema accessors for test code that needs direct schema access.
// biome-ignore lint/suspicious/noExplicitAny: Zod schema type not available without importing Zod
export const getRepomixOutputStyleSchema = (): any => {
  ensureZodSchemas();
  return _repomixOutputStyleSchema;
};

// biome-ignore lint/suspicious/noExplicitAny: Zod schema type not available without importing Zod
export const getRepomixConfigBaseSchema = (): any => {
  ensureZodSchemas();
  return _repomixConfigBaseSchema;
};

// biome-ignore lint/suspicious/noExplicitAny: Zod schema type not available without importing Zod
export const getRepomixConfigDefaultSchema = (): any => {
  ensureZodSchemas();
  return _repomixConfigDefaultSchema;
};

// Helper function for type-safe config definition
export const defineConfig = (config: RepomixConfigFile): RepomixConfigFile => config;
