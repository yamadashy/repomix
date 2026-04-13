// Default configuration values for Repomix.
//
// This module is intentionally kept free of Zod (and any heavy dependencies) so
// that the common startup path — no config file, default CLI args — never pays
// the ~44ms cost of loading Zod and constructing the schema objects.  Only when
// a config file needs to be validated does configSchema.ts (and Zod) get loaded.
//
// The values here MUST stay in sync with the Zod defaults defined in
// configSchema.ts.  The test suite in configSchema.test.ts verifies this.

import type { RepomixConfigDefault, RepomixConfigFile, RepomixOutputStyle } from './configSchema.js';

// Output style → default file path mapping
export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  xml: 'repomix-output.xml',
  markdown: 'repomix-output.md',
  plain: 'repomix-output.txt',
  json: 'repomix-output.json',
} as const;

// Hardcoded default config – the same values that
// `repomixConfigDefaultSchema.parse({ input: {}, output: { git: {} }, ignore: {}, security: {}, tokenCount: {} })`
// would produce.
export const defaultConfig: RepomixConfigDefault = {
  input: {
    maxFileSize: 50 * 1024 * 1024, // 50 MB
  },
  output: {
    filePath: defaultFilePathMap.xml,
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

// Helper function for type-safe config definition (no Zod needed)
export const defineConfig = (config: RepomixConfigFile): RepomixConfigFile => config;
