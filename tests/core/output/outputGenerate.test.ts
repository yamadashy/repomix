import process from 'node:process';
import { DOMParser } from '@xmldom/xmldom';
import { describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { generateOutput } from '../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../testing/testUtils.js';

const createStrictXmlParser = () => {
  const throwOnError = (msg: string) => {
    throw new Error(msg);
  };
  return new DOMParser({
    errorHandler: { warning: throwOnError, error: throwOnError, fatalError: throwOnError },
  });
};

describe('outputGenerate', () => {
  const mockDeps = {
    buildOutputGeneratorContext: vi.fn(),
    generateHandlebarOutput: vi.fn(),
    generateParsableXmlOutput: vi.fn(),
    generateParsableJsonOutput: vi.fn(),
    sortOutputFiles: vi.fn(),
  };
  test('generateOutput should use sortOutputFiles before generating content', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        git: { sortByChanges: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'content1' },
      { path: 'file2.txt', content: 'content2' },
    ];
    const sortedFiles = [
      { path: 'file2.txt', content: 'content2' },
      { path: 'file1.txt', content: 'content1' },
    ];

    mockDeps.sortOutputFiles.mockResolvedValue(sortedFiles);
    mockDeps.buildOutputGeneratorContext.mockResolvedValue({
      processedFiles: sortedFiles,
      config: mockConfig,
      treeString: '',
      generationDate: new Date().toISOString(),
      instruction: '',
      filesEnabled: true,
    });
    mockDeps.generateHandlebarOutput.mockResolvedValue('mock output');

    const output = await generateOutput(
      [process.cwd()],
      mockConfig,
      mockProcessedFiles,
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    expect(mockDeps.sortOutputFiles).toHaveBeenCalledWith(mockProcessedFiles, mockConfig, undefined, undefined);
    expect(mockDeps.buildOutputGeneratorContext).toHaveBeenCalledWith(
      [process.cwd()],
      mockConfig,
      [],
      sortedFiles,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(output).toBe('mock output');
  });

  test('generateOutput should write correct content to file (plain style)', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        topFilesLength: 2,
        showLineNumbers: false,
        removeComments: false,
        removeEmptyLines: false,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'content1' },
      { path: 'dir/file2.txt', content: 'content2' },
    ];

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);

    expect(output).toContain('File Summary');
    expect(output).toContain('File: file1.txt');
    expect(output).toContain('content1');
    expect(output).toContain('File: dir/file2.txt');
    expect(output).toContain('content2');
  });

  test('generateOutput should write correct content to file (parsable xml style)', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'xml',
        parsableStyle: true,
        topFilesLength: 2,
        showLineNumbers: false,
        removeComments: false,
        removeEmptyLines: false,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: '<div>foo</div>' },
      { path: 'dir/file2.txt', content: 'if (a && b)' },
    ];

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);

    const doc = createStrictXmlParser().parseFromString(output, 'text/xml');
    const repomix = doc.documentElement;

    expect(repomix.getElementsByTagName('file_summary').length).toBe(1);

    const fileElements = repomix.getElementsByTagName('file');
    expect(fileElements.length).toBe(2);
    expect(fileElements[0].getAttribute('path')).toBe(mockProcessedFiles[0].path);
    expect(fileElements[0].textContent).toBe(mockProcessedFiles[0].content);
    expect(fileElements[1].getAttribute('path')).toBe(mockProcessedFiles[1].path);
    expect(fileElements[1].textContent).toBe(mockProcessedFiles[1].content);
  });

  test('generateOutput should write correct content to file (parsable markdown style)', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'markdown',
        parsableStyle: true,
        topFilesLength: 2,
        showLineNumbers: false,
        removeComments: false,
        removeEmptyLines: false,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'content1' },
      { path: 'dir/file2.txt', content: '```\ncontent2\n```' },
    ];

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);

    expect(output).toContain('# File Summary');
    expect(output).toContain('## File: file1.txt');
    expect(output).toContain('````\ncontent1\n````');
    expect(output).toContain('## File: dir/file2.txt');
    expect(output).toContain('````\n```\ncontent2\n```\n````');
  });

  test('generateOutput (txt) should omit generationHeader when fileSummaryEnabled is false, but always include headerText if provided', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        fileSummary: false,
        headerText: 'ALWAYS SHOW THIS HEADER',
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);
    expect(output).not.toContain('This file is a merged representation'); // generationHeader
    expect(output).toContain('ALWAYS SHOW THIS HEADER');
  });

  test('generateOutput (xml) omits generationHeader when fileSummaryEnabled is false, but always includes headerText', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.xml',
        style: 'xml',
        fileSummary: false,
        headerText: 'XML HEADER',
        parsableStyle: true,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: '<div>foo</div>' }];
    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);
    const doc = createStrictXmlParser().parseFromString(output, 'text/xml');
    const repomix = doc.documentElement;
    expect(repomix.getElementsByTagName('file_summary').length).toBe(0);
    const header = repomix.getElementsByTagName('user_provided_header')[0];
    expect(header.textContent).toBe('XML HEADER');
  });

  test('generateOutput (markdown) omits generationHeader when fileSummaryEnabled is false, but always includes headerText', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.md',
        style: 'markdown',
        fileSummary: false,
        headerText: 'MARKDOWN HEADER',
        parsableStyle: false,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);
    expect(output).not.toContain('This file is a merged representation');
    expect(output).toContain('MARKDOWN HEADER');
  });

  test('generateOutput should include git diffs when enabled', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        git: { includeDiffs: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const mockGitDiffResult = {
      workTreeDiffContent: 'diff --git a/file.txt',
      stagedDiffContent: 'diff --git b/staged.txt',
    };

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, [], mockGitDiffResult);

    expect(output).toContain('Git Diffs');
    expect(output).toContain('diff --git a/file.txt');
    expect(output).toContain('diff --git b/staged.txt');
  });

  test('generateOutput should include git logs when enabled', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        git: { includeLogs: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const mockGitLogResult = {
      logContent: 'commit abc123\nAuthor: test',
      commits: [
        {
          date: '2024-01-01',
          message: 'Initial commit',
          files: ['file1.txt'],
        },
      ],
    };

    const output = await generateOutput(
      [process.cwd()],
      mockConfig,
      mockProcessedFiles,
      [],
      undefined,
      mockGitLogResult,
    );

    expect(output).toContain('Git Logs');
    expect(output).toContain('Initial commit');
    expect(output).toContain('2024-01-01');
  });

  test('generateOutput should write correct content to file (json style)', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.json',
        style: 'json',
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'content1' },
      { path: 'file2.txt', content: 'content2' },
    ];

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('files');
    expect(parsed.files).toHaveProperty('file1.txt');
    expect(parsed.files).toHaveProperty('file2.txt');
    expect(parsed.files['file1.txt']).toBe('content1');
    expect(parsed.files['file2.txt']).toBe('content2');
  });

  test('generateOutput should exclude files section when files output is disabled', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        files: false,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, []);

    expect(output).not.toContain('File: file1.txt');
    expect(output).not.toContain('content1');
  });

  test('generateOutput should exclude directory structure when disabled', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.txt',
        style: 'plain',
        directoryStructure: false,
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];

    const output = await generateOutput([process.cwd()], mockConfig, mockProcessedFiles, ['file1.txt']);

    expect(output).not.toContain('Directory Structure');
  });
});
