import { describe, expect, test } from 'vitest';
import type { ProcessedFile } from '../../../../src/core/file/fileTypes.js';
import type { GitLogCommit } from '../../../../src/core/git/gitLogHandle.js';
import type { RenderContext } from '../../../../src/core/output/outputGeneratorTypes.js';
import { renderMarkdown } from '../../../../src/core/output/outputStyles/markdownStyle.js';
import { renderPlain } from '../../../../src/core/output/outputStyles/plainStyle.js';
import { renderXml } from '../../../../src/core/output/outputStyles/xmlStyle.js';

// Snapshot-based regression guards for the rendered output of each style.
// Established when migrating away from Handlebars; kept as a tripwire to
// catch any future change in the rendered byte stream.
const render = {
  markdown: renderMarkdown,
  xml: renderXml,
  plain: renderPlain,
};

const sampleFiles: ProcessedFile[] = [
  { path: 'src/index.ts', content: 'export const greet = () => "hi";\n' },
  { path: 'src/utils/helpers.py', content: 'def add(a, b):\n    return a + b\n' },
  { path: 'README.md', content: '# Title\n\nSome text.\n' },
];

const sampleCommits: GitLogCommit[] = [
  {
    date: '2026-01-15',
    message: 'Initial commit',
    files: ['src/index.ts', 'README.md'],
  },
  {
    date: '2026-01-20',
    message: 'Add helpers',
    files: ['src/utils/helpers.py'],
  },
];

const baseContext: Partial<RenderContext> = {
  generationHeader:
    'This file is a merged representation of the entire codebase, combined into a single document by Repomix.',
  summaryPurpose: 'Test purpose statement.',
  summaryFileFormat:
    'The content is organized as follows:\n1. This summary section\n2. Repository information\n3. Directory structure\n4. Repository files (if enabled)',
  summaryUsageGuidelines: '- Treat as read-only.\n- Use file paths to distinguish files.',
  summaryNotes: '- Some files may have been excluded.\n- Binary files are not included.',
  headerText: undefined,
  instruction: '',
  treeString: 'src/\n  index.ts\n  utils/\n    helpers.py\nREADME.md',
  processedFiles: sampleFiles,
  fileLineCounts: {},
  fileSummaryEnabled: true,
  directoryStructureEnabled: true,
  filesEnabled: true,
  escapeFileContent: false,
  markdownCodeBlockDelimiter: '```',
  gitDiffEnabled: false,
  gitDiffWorkTree: undefined,
  gitDiffStaged: undefined,
  gitLogEnabled: false,
  gitLogContent: undefined,
  gitLogCommits: undefined,
};

describe('migration baseline: markdown style', () => {
  test('all sections enabled with git diff, git log, headerText, and instruction', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      headerText: 'Project description from headerText option.',
      instruction: 'Follow the existing code style.',
      gitDiffEnabled: true,
      gitDiffWorkTree: 'diff --git a/src/index.ts b/src/index.ts\n+added line\n',
      gitDiffStaged: 'diff --git b/src/index.ts b/src/index.ts\n+staged line\n',
      gitLogEnabled: true,
      gitLogCommits: sampleCommits,
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('content with backtick collision uses widened code fence delimiter', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      processedFiles: [{ path: 'docs/example.md', content: 'Inline ``` triple backticks.\n' }],
      markdownCodeBlockDelimiter: '````',
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('fileSummary disabled but headerText set', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      headerText: 'Standalone header.',
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('files disabled, directory structure on', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      filesEnabled: false,
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('directory structure disabled, files on', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      directoryStructureEnabled: false,
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('git log only with multiple commits and multiple files per commit', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      directoryStructureEnabled: false,
      filesEnabled: false,
      gitLogEnabled: true,
      gitLogCommits: sampleCommits,
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('instruction only', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      directoryStructureEnabled: false,
      filesEnabled: false,
      instruction: 'Just an instruction.',
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });

  test('files with various extensions exercise getFileExtension helper', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      directoryStructureEnabled: false,
      processedFiles: [
        { path: 'a.ts', content: 'ts\n' },
        { path: 'b.py', content: 'py\n' },
        { path: 'c.unknown', content: 'unknown\n' },
        { path: 'Dockerfile', content: 'docker\n' },
        { path: 'no-ext', content: 'plain\n' },
      ],
    };
    expect(render.markdown(ctx)).toMatchSnapshot();
  });
});

describe('migration baseline: xml style', () => {
  test('all sections enabled with git diff, git log, headerText, and instruction', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      headerText: 'Project description from headerText option.',
      instruction: 'Follow the existing code style.',
      gitDiffEnabled: true,
      gitDiffWorkTree: 'diff --git a/src/index.ts b/src/index.ts\n+added line\n',
      gitDiffStaged: 'diff --git b/src/index.ts b/src/index.ts\n+staged line\n',
      gitLogEnabled: true,
      gitLogCommits: sampleCommits,
    };
    expect(render.xml(ctx)).toMatchSnapshot();
  });

  test('fileSummary disabled but headerText set', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      headerText: 'Standalone header.',
    };
    expect(render.xml(ctx)).toMatchSnapshot();
  });

  test('files disabled, directory structure on', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      filesEnabled: false,
    };
    expect(render.xml(ctx)).toMatchSnapshot();
  });

  test('git log only with multiple commits', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      directoryStructureEnabled: false,
      filesEnabled: false,
      gitLogEnabled: true,
      gitLogCommits: sampleCommits,
    };
    expect(render.xml(ctx)).toMatchSnapshot();
  });
});

describe('migration baseline: plain style', () => {
  test('all sections enabled with git diff, git log, headerText, and instruction', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      headerText: 'Project description from headerText option.',
      instruction: 'Follow the existing code style.',
      gitDiffEnabled: true,
      gitDiffWorkTree: 'diff --git a/src/index.ts b/src/index.ts\n+added line\n',
      gitDiffStaged: 'diff --git b/src/index.ts b/src/index.ts\n+staged line\n',
      gitLogEnabled: true,
      gitLogCommits: sampleCommits,
    };
    expect(render.plain(ctx)).toMatchSnapshot();
  });

  test('fileSummary disabled but headerText set', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      headerText: 'Standalone header.',
    };
    expect(render.plain(ctx)).toMatchSnapshot();
  });

  test('minimal: only files', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      directoryStructureEnabled: false,
    };
    expect(render.plain(ctx)).toMatchSnapshot();
  });

  test('git log only with multiple commits', () => {
    const ctx: Partial<RenderContext> = {
      ...baseContext,
      fileSummaryEnabled: false,
      directoryStructureEnabled: false,
      filesEnabled: false,
      gitLogEnabled: true,
      gitLogCommits: sampleCommits,
    };
    expect(render.plain(ctx)).toMatchSnapshot();
  });
});
