import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../../testing/testUtils.js';

vi.mock('fs/promises');

describe('xmlStyle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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

  test('xml style: renders files, git diffs and git logs sections', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.xml',
        style: 'xml',
        fileSummary: false,
        headerText: '',
        parsableStyle: false,
        git: {
          includeDiffs: true,
          includeLogs: true,
        },
      },
    });

    const processedFiles = [{ path: 'src/a.ts', content: 'const a = 1;' }];
    const gitDiffResult = {
      workTreeDiffContent: 'diff --git a/src/a.ts b/src/a.ts\n+const a = 1;',
      stagedDiffContent: '',
    };
    const gitLogResult = {
      logContent: '',
      commits: [
        { date: '2025-01-02', message: 'feat: add a', files: ['src/a.ts', 'src/b.ts'] },
        { date: '2025-01-01', message: 'init', files: ['README.md'] },
      ],
    };

    const output = await generateOutput(
      [process.cwd()],
      mockConfig,
      processedFiles,
      ['src/a.ts'],
      gitDiffResult,
      gitLogResult,
    );

    // File entries use the path attribute and raw (unescaped) content
    expect(output).toContain('<file path="src/a.ts">\nconst a = 1;\n</file>');
    // Git diff section
    expect(output).toContain('<git_diffs>\n<git_diff_work_tree>\ndiff --git a/src/a.ts b/src/a.ts');
    expect(output).toContain('</git_diff_staged>\n</git_diffs>');
    // Git log commits with date / message / per-commit file list
    expect(output).toContain('<git_log_commit>\n<date>2025-01-02</date>\n<message>feat: add a</message>\n<files>');
    expect(output).toContain('src/a.ts\nsrc/b.ts\n</files>\n</git_log_commit>');
  });
});
