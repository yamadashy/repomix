import type { RenderContext } from '../../../../src/core/output/outputGeneratorTypes.js';

// Render contexts for the golden tests in `renderStyles.golden.test.ts`.
// The values are deliberately awkward: characters that an escaping template engine
// would rewrite, template-looking text, blank lines and missing optional values.
// This module has no runtime imports so it can also be loaded outside vitest.

const AWKWARD = `a & b < c > d "e" 'f' \`g\` h=i {{not-a-template}} {{{raw}}}`;

export const allSectionsContext: RenderContext = {
  generationHeader: 'This file is a merged representation of the entire codebase.',
  summaryPurpose: 'Purpose line 1\nPurpose line 2',
  summaryFileFormat: 'The content is organized as follows:\n1. This summary section',
  summaryUsageGuidelines: `- Guideline one\n- ${AWKWARD}`,
  summaryNotes: '- Note one\n- Note two',
  headerText: `Custom header\n\n${AWKWARD}`,
  instruction: `Follow these instructions.\n\n${AWKWARD}`,
  treeString: 'src/\n  index.ts\n  data file.txt\nREADME.md',
  processedFiles: [
    { path: 'src/index.ts', content: `export const a = '<b>';\n\n// ${AWKWARD}` },
    { path: 'README.md', content: '# Title\n\n```ts\nconst x = 1;\n```\n' },
    { path: 'src/data file.txt', content: '' },
    { path: 'Dockerfile', content: 'FROM node:24' },
  ],
  fileLineCounts: { 'src/index.ts': 3, 'README.md': 6, 'src/data file.txt': 1, Dockerfile: 1 },
  fileSummaryEnabled: true,
  directoryStructureEnabled: true,
  filesEnabled: true,
  escapeFileContent: false,
  markdownCodeBlockDelimiter: '````',
  gitDiffEnabled: true,
  gitDiffWorkTree: `diff --git a/a.ts b/a.ts\n-old\n+new ${AWKWARD}`,
  gitDiffStaged: 'diff --git a/b.ts b/b.ts\n+added',
  gitLogEnabled: true,
  gitLogContent: 'unused by the templates',
  gitLogCommits: [
    { date: '2026-01-02 03:04:05 +0900', message: `feat: first ${AWKWARD}`, files: ['src/index.ts', 'README.md'] },
    { date: '2026-01-01 00:00:00 +0000', message: 'chore: empty commit', files: [] },
  ],
};

// Only the file list: every optional section is off or missing.
export const filesOnlyContext: RenderContext = {
  ...allSectionsContext,
  headerText: undefined,
  instruction: '',
  fileSummaryEnabled: false,
  directoryStructureEnabled: false,
  gitDiffEnabled: false,
  gitDiffWorkTree: undefined,
  gitDiffStaged: undefined,
  gitLogEnabled: false,
  gitLogContent: undefined,
  gitLogCommits: undefined,
};

// Sections enabled but with nothing to show in them.
export const emptySectionsContext: RenderContext = {
  ...allSectionsContext,
  headerText: '',
  instruction: '',
  processedFiles: [],
  fileLineCounts: {},
  gitDiffWorkTree: undefined,
  gitDiffStaged: undefined,
  gitLogCommits: undefined,
};

export const goldenRenderContexts = {
  'all-sections': allSectionsContext,
  'files-only': filesOnlyContext,
  'empty-sections': emptySectionsContext,
} as const;
