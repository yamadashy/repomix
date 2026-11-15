import process from 'node:process';
import { describe, expect, test } from 'vitest';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';
import { renderXmlStyle } from '../../../../src/core/output/outputStyles/xmlStyle.js';
import { createMockConfig, createMockRenderContext } from '../../../testing/testUtils.js';

describe('xmlStyle', () => {
  test('generateOutput for xml should include user-provided header text', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'xml',
        headerText: 'Custom header text',
        topFilesLength: 2,
        showLineNumbers: false,
        removeComments: false,
        removeEmptyLines: false,
      },
    });

    const output = await generateOutput([process.cwd()], mockConfig, [], []);

    expect(output).toContain('file_summary');
    expect(output).toContain('directory_structure');
    expect(output).toContain('Custom header text');
    expect(output).toContain('files');
  });

  test('xml style: headerText always present, generationHeader only if fileSummaryEnabled', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.xml',
        style: 'xml',
        fileSummary: false,
        headerText: 'XML HEADER',
        parsableStyle: false,
      },
    });
    const output = await generateOutput([process.cwd()], mockConfig, [], []);
    expect(output).not.toContain('This file is a merged representation');
    expect(output).toContain('XML HEADER');
  });

  describe('renderXmlStyle', () => {
    test('should keep the fixed separator newlines when every section is disabled', () => {
      expect(renderXmlStyle(createMockRenderContext())).toBe('\n\n\n');
    });

    test('should render files with their path attribute', () => {
      const result = renderXmlStyle(
        createMockRenderContext({
          filesEnabled: true,
          processedFiles: [
            { path: 'a.ts', content: 'A' },
            { path: 'empty.txt', content: '' },
          ],
        }),
      );
      expect(result).toBe(
        "<files>\nThis section contains the contents of the repository's files.\n\n" +
          '<file path="a.ts">\nA\n</file>\n\n' +
          '<file path="empty.txt">\n\n</file>\n\n' +
          '</files>\n\n\n\n',
      );
    });

    test('should render git diffs, treating missing diff content as empty', () => {
      const result = renderXmlStyle(createMockRenderContext({ gitDiffEnabled: true, gitDiffStaged: '+staged' }));
      expect(result).toBe(
        '\n<git_diffs>\n<git_diff_work_tree>\n\n</git_diff_work_tree>\n<git_diff_staged>\n+staged\n</git_diff_staged>\n</git_diffs>\n\n\n',
      );
    });

    test('should render git log commits, including commits without files', () => {
      const result = renderXmlStyle(
        createMockRenderContext({
          gitLogEnabled: true,
          gitLogCommits: [
            { date: 'D1', message: 'M1', files: ['a.ts'] },
            { date: 'D2', message: 'M2', files: [] },
          ],
        }),
      );
      expect(result).toBe(
        '\n\n<git_logs>\n' +
          '<git_log_commit>\n<date>D1</date>\n<message>M1</message>\n<files>\na.ts\n</files>\n</git_log_commit>\n' +
          '<git_log_commit>\n<date>D2</date>\n<message>M2</message>\n<files>\n</files>\n</git_log_commit>\n' +
          '</git_logs>\n\n',
      );
    });

    test('should insert values verbatim without XML escaping', () => {
      const raw = '& < > " \' ` = {{x}}';
      const result = renderXmlStyle(
        createMockRenderContext({
          headerText: raw,
          instruction: raw,
          filesEnabled: true,
          processedFiles: [{ path: raw, content: raw }],
        }),
      );
      expect(result).toContain(`<user_provided_header>\n${raw}\n</user_provided_header>`);
      expect(result).toContain(`<file path="${raw}">\n${raw}\n</file>`);
      expect(result).toContain(`<instruction>\n${raw}\n</instruction>\n`);
    });
  });
});
