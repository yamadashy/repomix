import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../../testing/testUtils.js';

const normalizeOutput = (output: string | string[]): string => (Array.isArray(output) ? output.join('') : output);

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

    const output = normalizeOutput(await generateOutput([process.cwd()], mockConfig, [], []));

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
    const output = normalizeOutput(await generateOutput([process.cwd()], mockConfig, [], []));
    expect(output).not.toContain('This file is a merged representation');
    expect(output).toContain('XML HEADER');
  });
});
