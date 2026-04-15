import process from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../../testing/testUtils.js';

vi.mock('fs/promises');

describe('plainStyle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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

    const result = await generateOutput([process.cwd()], mockConfig, [], []);

    expect(result.output).toContain('File Summary');
    expect(result.output).toContain('Directory Structure');
    expect(result.output).toContain('Custom header text');
    expect(result.output).toContain('Files');
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
    const result = await generateOutput([process.cwd()], mockConfig, [], []);
    expect(result.output).not.toContain('This file is a merged representation');
    expect(result.output).toContain('PLAIN HEADER');
  });
});
