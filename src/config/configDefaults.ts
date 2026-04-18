import type { RepomixConfigDefault } from './configSchema.js';

// Output style values are duplicated here to avoid importing zod at module load
// time. The schema in configSchema.ts uses z.enum(OUTPUT_STYLES) so the source
// of truth stays in sync. Verified by configDefaults.test.ts.
export const OUTPUT_STYLES = ['xml', 'markdown', 'json', 'plain'] as const;
export type RepomixOutputStyle = (typeof OUTPUT_STYLES)[number];

export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  xml: 'repomix-output.xml',
  markdown: 'repomix-output.md',
  plain: 'repomix-output.txt',
  json: 'repomix-output.json',
} as const;

// Default values are mirrored here as a plain object to avoid loading zod at
// module load time. The values must stay in sync with the .default(X) clauses
// in repomixConfigDefaultSchema (configSchema.ts). A test in
// tests/config/configDefaults.test.ts verifies that this object matches the
// schema's parsed defaults.
export const defaultConfig: RepomixConfigDefault = {
  input: {
    maxFileSize: 50 * 1024 * 1024,
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
