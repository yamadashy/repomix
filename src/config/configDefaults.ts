import type { TokenEncoding } from '../core/metrics/TokenCounter.js';

// Output style type
export type RepomixOutputStyle = 'xml' | 'markdown' | 'json' | 'plain';

// Default values map
export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  xml: 'repomix-output.xml',
  markdown: 'repomix-output.md',
  plain: 'repomix-output.txt',
  json: 'repomix-output.json',
} as const;

// Re-export types from configSchema for convenience.
// These are compile-time only (import type) and do NOT trigger Zod loading.
export type { RepomixConfigCli, RepomixConfigDefault, RepomixConfigFile, RepomixConfigMerged } from './configSchema.js';

// Plain object literal with all default values inlined.
// Avoids a synchronous Zod .parse() call at module-load time.
export const defaultConfig = {
  input: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  output: {
    filePath: defaultFilePathMap.xml,
    style: 'xml' as RepomixOutputStyle,
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
    tokenCountTree: false as boolean | number | string,
    git: {
      sortByChanges: true,
      sortByChangesMaxCommits: 100,
      includeDiffs: false,
      includeLogs: false,
      includeLogsCount: 50,
    },
  },
  include: [] as string[],
  ignore: {
    useGitignore: true,
    useDotIgnore: true,
    useDefaultPatterns: true,
    customPatterns: [] as string[],
  },
  security: {
    enableSecurityCheck: true,
  },
  tokenCount: {
    encoding: 'o200k_base' as TokenEncoding,
  },
};

// Helper function for type-safe config definition
export const defineConfig = (
  config: import('./configSchema.js').RepomixConfigFile,
): import('./configSchema.js').RepomixConfigFile => config;
