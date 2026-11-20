import process from 'node:process';
import { describe, expect, test } from 'vitest';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';
import { renderPlainStyle } from '../../../../src/core/output/outputStyles/plainStyle.js';
import { createMockConfig, createMockRenderContext } from '../../../testing/testUtils.js';

describe('plainStyle', () => {
  test('generateOutput for plain should include user-provided header text', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        headerText: 'Custom header text',
        topFilesLength: 2,
        showLineNumbers: false,
        removeComments: false,
        removeEmptyLines: false,
      },
    });

    const output = await generateOutput([process.cwd()], mockConfig, [], []);

    expect(output).toContain('File Summary');
    expect(output).toContain('Directory Structure');
    expect(output).toContain('Custom header text');
    expect(output).toContain('Files');
  });

  test('plain style: headerText always present, generationHeader only if fileSummaryEnabled', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        fileSummary: false,
        headerText: 'PLAIN HEADER',
      },
    });
    const output = await generateOutput([process.cwd()], mockConfig, [], []);
    expect(output).not.toContain('This file is a merged representation');
    expect(output).toContain('PLAIN HEADER');
  });

  describe('renderPlainStyle', () => {
    const SEP = '='.repeat(16);
    const LONG = '='.repeat(64);
    const END = `${LONG}\nEnd of Codebase\n${LONG}\n`;

    test('should always render the end marker after the fixed separator newlines', () => {
      expect(renderPlainStyle(createMockRenderContext())).toBe(`\n\n\n\n\n${END}`);
    });

    test('should render files between separators', () => {
      const result = renderPlainStyle(
        createMockRenderContext({ filesEnabled: true, processedFiles: [{ path: 'a.ts', content: 'A' }] }),
      );
      expect(result).toBe(`\n${LONG}\nFiles\n${LONG}\n\n${SEP}\nFile: a.ts\n${SEP}\nA\n\n\n\n\n\n${END}`);
    });

    test('should render git diffs, treating missing diff content as empty', () => {
      const result = renderPlainStyle(createMockRenderContext({ gitDiffEnabled: true, gitDiffWorkTree: '+wt' }));
      expect(result).toBe(
        `\n\n${LONG}\nGit Diffs\n${LONG}\n${SEP}\n+wt\n${SEP}\n\n${SEP}\nGit Diffs Staged\n${SEP}\n\n\n\n\n\n${END}`,
      );
    });

    test('should render git log commits, including commits without files', () => {
      const result = renderPlainStyle(
        createMockRenderContext({
          gitLogEnabled: true,
          gitLogCommits: [
            { date: 'D1', message: 'M1', files: ['a.ts'] },
            { date: 'D2', message: 'M2', files: [] },
          ],
        }),
      );
      expect(result).toBe(
        `\n\n\n${LONG}\nGit Logs\n${LONG}\n` +
          `${SEP}\nDate: D1\nMessage: M1\nFiles:\n  - a.ts\n${SEP}\n\n` +
          `${SEP}\nDate: D2\nMessage: M2\nFiles:\n${SEP}\n\n` +
          `\n\n\n${END}`,
      );
    });

    test('should render header and instruction sections verbatim', () => {
      const raw = '& < > " \' ` = {{x}}';
      const result = renderPlainStyle(createMockRenderContext({ headerText: raw, instruction: raw }));
      expect(result).toBe(
        `\n${LONG}\nUser Provided Header\n${LONG}\n${raw}\n\n\n\n\n${LONG}\nInstruction\n${LONG}\n${raw}\n\n${END}`,
      );
    });
  });
});
