import { describe, expect, test } from 'vitest';
import { renderMarkdownFile, renderMarkdownStyle } from '../../../../src/core/output/outputStyles/markdownStyle.js';
import { createMockRenderContext } from '../../../testing/testUtils.js';

describe('markdownStyle', () => {
  describe('renderMarkdownStyle', () => {
    test('should render all main sections with basic data', () => {
      const result = renderMarkdownStyle(
        createMockRenderContext({
          generationHeader: 'Generated Test Header',
          summaryPurpose: 'Test Purpose',
          summaryFileFormat: 'Test Format',
          summaryUsageGuidelines: 'Test Guidelines',
          summaryNotes: 'Test Notes',
          treeString: 'src/\n  index.ts',
          processedFiles: [{ path: 'src/index.ts', content: 'console.log("Hello");' }],
          fileSummaryEnabled: true,
          directoryStructureEnabled: true,
          filesEnabled: true,
        }),
      );

      expect(result).toContain('Generated Test Header');
      expect(result).toContain('# File Summary');
      expect(result).toContain('Test Purpose');
      expect(result).toContain('Test Format');
      expect(result).toContain('Test Guidelines');
      expect(result).toContain('Test Notes');
      expect(result).toContain('# Directory Structure\n```\nsrc/\n  index.ts\n```\n');
      expect(result).toContain('# Files\n\n## File: src/index.ts\n```typescript\nconsole.log("Hello");\n```\n');
    });

    test('should render optional header text when provided', () => {
      const result = renderMarkdownStyle(createMockRenderContext({ headerText: 'Custom Header Text' }));
      expect(result).toContain('# User Provided Header\nCustom Header Text\n');
    });

    test('should not render header section when headerText is empty or missing', () => {
      expect(renderMarkdownStyle(createMockRenderContext({ headerText: undefined }))).not.toContain(
        '# User Provided Header',
      );
      expect(renderMarkdownStyle(createMockRenderContext({ headerText: '' }))).not.toContain('# User Provided Header');
    });

    test('should render instruction section only when provided', () => {
      const result = renderMarkdownStyle(createMockRenderContext({ instruction: 'Custom Instruction Text' }));
      expect(result).toContain('# Instruction\nCustom Instruction Text\n');
      expect(renderMarkdownStyle(createMockRenderContext())).not.toContain('# Instruction');
    });

    test('should display headerText even if fileSummary is disabled', () => {
      const result = renderMarkdownStyle(
        createMockRenderContext({ headerText: 'MARKDOWN HEADER', fileSummaryEnabled: false }),
      );
      expect(result).not.toContain('GENERATION_HEADER');
      expect(result).toContain('MARKDOWN HEADER');
    });

    test('should not display generationHeader if fileSummary is disabled', () => {
      const result = renderMarkdownStyle(
        createMockRenderContext({ fileSummaryEnabled: false, directoryStructureEnabled: true }),
      );
      expect(result).not.toContain('GENERATION_HEADER');
      expect(result).toContain('# Directory Structure');
    });

    test('should keep the fixed separator newlines when every section is disabled', () => {
      expect(renderMarkdownStyle(createMockRenderContext())).toBe('\n\n\n');
    });

    test('should render git diffs, treating missing diff content as empty', () => {
      const result = renderMarkdownStyle(
        createMockRenderContext({ gitDiffEnabled: true, gitDiffWorkTree: '+added', gitDiffStaged: undefined }),
      );
      expect(result).toBe(
        '\n# Git Diffs\n## Git Diffs Working Tree\n```diff\n+added\n```\n\n## Git Diffs Staged\n```diff\n\n```\n\n\n\n',
      );
    });

    test('should render git log commits, including commits without files', () => {
      const result = renderMarkdownStyle(
        createMockRenderContext({
          gitLogEnabled: true,
          gitLogCommits: [
            { date: '2024-01-01', message: 'first', files: ['a.ts', 'b.ts'] },
            { date: '2024-01-02', message: 'empty', files: [] },
          ],
        }),
      );
      expect(result).toBe(
        '\n\n# Git Logs\n\n' +
          '## Commit: 2024-01-01\n**Message:** first\n\n**Files:**\n- a.ts\n- b.ts\n\n' +
          '## Commit: 2024-01-02\n**Message:** empty\n\n**Files:**\n\n' +
          '\n',
      );
    });

    test('should insert values verbatim without escaping', () => {
      const raw = '& < > " \' ` = {{x}}';
      const result = renderMarkdownStyle(
        createMockRenderContext({ headerText: raw, filesEnabled: true, processedFiles: [{ path: raw, content: raw }] }),
      );
      expect(result).toContain(`# User Provided Header\n${raw}\n`);
      expect(result).toContain(`## File: ${raw}\n\`\`\`\n${raw}\n\`\`\``);
    });
  });

  describe('renderMarkdownFile', () => {
    test('should render a file entry with its language hint and delimiter', () => {
      expect(renderMarkdownFile({ path: 'docker/Dockerfile', content: 'FROM node' }, '````')).toBe(
        '## File: docker/Dockerfile\n````dockerfile\nFROM node\n````\n\n',
      );
    });

    test('should omit the language hint for unknown extensions', () => {
      expect(renderMarkdownFile({ path: 'notes.unknown', content: '' }, '```')).toBe(
        '## File: notes.unknown\n```\n\n```\n\n',
      );
    });
  });
});
