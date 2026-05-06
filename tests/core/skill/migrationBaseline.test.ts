import { describe, expect, test } from 'vitest';
import type { RenderContext } from '../../../src/core/output/outputGeneratorTypes.js';
import {
  generateFilesSection,
  generateStructureSection,
  generateSummarySection,
} from '../../../src/core/skill/skillSectionGenerators.js';
import { generateSkillMd } from '../../../src/core/skill/skillStyle.js';

// Snapshot-based regression guards for the skill module rendering.
// Established when migrating away from Handlebars; kept as a tripwire to
// catch any future change in the rendered byte stream.

const baseContext: RenderContext = {
  generationHeader:
    'This file is a merged representation of the entire codebase, combined into a single document by Repomix.',
  summaryPurpose: 'Test purpose statement.',
  summaryFileFormat:
    'The content is organized as follows:\n1. This summary section\n2. Repository information\n3. Directory structure\n4. Repository files (if enabled)',
  summaryUsageGuidelines: '- Treat as read-only.\n- Use file paths to distinguish files.',
  summaryNotes: '- Some files may have been excluded.\n- Binary files are not included.',
  headerText: undefined,
  instruction: '',
  treeString: 'src/\n  index.ts\n  utils/\n    helpers.py',
  processedFiles: [
    { path: 'src/index.ts', content: 'export const greet = () => "hi";\n' },
    { path: 'src/utils/helpers.py', content: 'def add(a, b):\n    return a + b\n' },
  ],
  fileLineCounts: {
    'src/index.ts': 1,
    'src/utils/helpers.py': 2,
  },
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

describe('migration baseline: SKILL.md (skillStyle)', () => {
  test('with techStack and sourceUrl', () => {
    const result = generateSkillMd({
      skillName: 'my-project-skill',
      skillDescription: 'Reference codebase for My Project.',
      projectName: 'My Project',
      totalFiles: 42,
      totalLines: 1000,
      totalTokens: 12345,
      hasTechStack: true,
      sourceUrl: 'https://github.com/example/my-project',
    });
    expect(result).toMatchSnapshot();
  });

  test('without techStack and without sourceUrl', () => {
    const result = generateSkillMd({
      skillName: 'simple-skill',
      skillDescription: 'A simple project.',
      projectName: 'Simple',
      totalFiles: 3,
      totalLines: 50,
      totalTokens: 500,
      hasTechStack: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('with techStack but no sourceUrl', () => {
    const result = generateSkillMd({
      skillName: 'local-skill',
      skillDescription: 'Local-only skill.',
      projectName: 'Local',
      totalFiles: 10,
      totalLines: 200,
      totalTokens: 2000,
      hasTechStack: true,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('migration baseline: skillSectionGenerators', () => {
  describe('generateSummarySection', () => {
    test('without statistics section', () => {
      expect(generateSummarySection(baseContext)).toMatchSnapshot();
    });

    test('with statistics section', () => {
      const statisticsSection = '## Statistics\n\n10 files | 500 lines | 5000 tokens';
      expect(generateSummarySection(baseContext, statisticsSection)).toMatchSnapshot();
    });
  });

  describe('generateStructureSection', () => {
    test('enabled', () => {
      expect(generateStructureSection(baseContext)).toMatchSnapshot();
    });

    test('disabled returns empty string', () => {
      const ctx: RenderContext = { ...baseContext, directoryStructureEnabled: false };
      expect(generateStructureSection(ctx)).toBe('');
    });
  });

  describe('generateFilesSection', () => {
    test('enabled with mixed extensions', () => {
      const ctx: RenderContext = {
        ...baseContext,
        processedFiles: [
          { path: 'src/index.ts', content: 'export const x = 1;\n' },
          { path: 'src/main.py', content: 'print("hi")\n' },
          { path: 'Dockerfile', content: 'FROM node:20\n' },
          { path: 'README.unknown', content: 'unknown ext\n' },
        ],
      };
      expect(generateFilesSection(ctx)).toMatchSnapshot();
    });

    test('disabled returns empty string', () => {
      const ctx: RenderContext = { ...baseContext, filesEnabled: false };
      expect(generateFilesSection(ctx)).toBe('');
    });

    test('content with backtick collision (delimiter widens to 4 backticks)', () => {
      const ctx: RenderContext = {
        ...baseContext,
        processedFiles: [{ path: 'docs/example.md', content: 'Inline ``` triple backticks.\n' }],
        markdownCodeBlockDelimiter: '````',
      };
      expect(generateFilesSection(ctx)).toMatchSnapshot();
    });
  });
});
