import process from 'node:process';
import { XMLParser } from 'fast-xml-parser';
import { describe, expect, test, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { generateOutput } from '../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../testing/testUtils.js';

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
      mockDeps,
    );

    expect(mockDeps.sortOutputFiles).toHaveBeenCalledWith(mockProcessedFiles, mockConfig);
    expect(mockDeps.buildOutputGeneratorContext).toHaveBeenCalledWith(
      [process.cwd()],
      mockConfig,
      [],
      sortedFiles,
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

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedOutput = parser.parse(output);

    expect(parsedOutput.repomix.file_summary).not.toBeUndefined();
    expect(parsedOutput.repomix.files.file).toEqual([
      {
        '#text': mockProcessedFiles[0].content,
        '@_path': mockProcessedFiles[0].path,
      },
      {
        '#text': mockProcessedFiles[1].content,
        '@_path': mockProcessedFiles[1].path,
      },
    ]);
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
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedOutput = parser.parse(output);
    expect(parsedOutput.repomix['#text']).toBeUndefined();
    expect(parsedOutput.repomix.user_provided_header).toBe('XML HEADER');
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
          metadata: {
            hash: '',
            abbreviatedHash: '',
            parents: [],
            author: {
              name: '',
              email: '',
              date: '2024-01-01',
            },
            committer: {
              name: '',
              email: '',
              date: '2024-01-01',
            },
            message: 'Initial commit',
            body: '',
            files: ['file1.txt'],
          },
          patch: undefined,
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

  test('generateOutput should include git commit history when enabled (markdown)', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.md',
        style: 'markdown',
        git: { includeLogs: true, includeCommitGraph: true, includeCommitPatches: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const mockGitLogResult = {
      summary: {
        totalCommits: 2,
        mergeCommits: 0,
        range: 'HEAD~2..HEAD',
        detailLevel: 'stat' as const,
      },
      graph: {
        commits: [],
        graph: '* abc123 feat: add feature',
        mermaidGraph: 'gitGraph\n  commit id: "abc123: feat: add feature"',
        mergeCommits: [],
        tags: { 'v1.0.0': 'abc1234567890' },
      },
      commits: [
        {
          metadata: {
            hash: 'abc1234567890',
            abbreviatedHash: 'abc123',
            parents: ['def456'],
            author: { name: 'John Doe', email: 'john@example.com', date: '2025-11-20T12:00:00Z' },
            committer: { name: 'John Doe', email: 'john@example.com', date: '2025-11-20T12:00:00Z' },
            message: 'feat: add feature',
            body: 'Extended description',
            files: ['src/feature.ts', 'tests/feature.test.ts'],
          },
          patch: 'diff --git a/src/feature.ts',
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

    expect(output).toContain('# Git Logs');
    expect(output).toContain('feat: add feature');
    expect(output).toContain('John Doe');
    expect(output).toContain('john@example.com');
    expect(output).toContain('Files Changed');
    expect(output).toContain('src/feature.ts');
    expect(output).toContain('tests/feature.test.ts');
  });

  test('generateOutput should include git commit history in parsable XML', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.xml',
        style: 'xml',
        parsableStyle: true,
        git: { includeLogs: true, includeCommitGraph: true, includeCommitPatches: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const mockGitLogResult = {
      summary: {
        totalCommits: 1,
        mergeCommits: 0,
        range: 'HEAD~1..HEAD',
        detailLevel: 'patch' as const,
      },
      graph: {
        commits: [],
        graph: '* abc123 fix: bug fix',
        mermaidGraph: 'gitGraph\n  commit id: "abc123: fix: bug fix"',
        mergeCommits: [],
        tags: {},
      },
      commits: [
        {
          metadata: {
            hash: 'abc1234567890abcdef',
            abbreviatedHash: 'abc1234',
            parents: ['parent123'],
            author: { name: 'Jane Smith', email: 'jane@example.com', date: '2025-11-21T10:00:00Z' },
            committer: { name: 'Jane Smith', email: 'jane@example.com', date: '2025-11-21T10:00:00Z' },
            message: 'fix: bug fix',
            body: '',
            files: ['src/bugfix.ts'],
          },
          patch: 'diff --git a/src/bugfix.ts',
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

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedOutput = parser.parse(output);

    expect(parsedOutput.repomix.git_logs).toBeDefined();
    expect(parsedOutput.repomix.git_logs.summary.total_commits).toBe(1);
    expect(parsedOutput.repomix.git_logs.summary.range).toBe('HEAD~1..HEAD');
    expect(parsedOutput.repomix.git_logs.commit_graph.ascii_graph).toBe('* abc123 fix: bug fix');
    // merge_commits is empty array in mock, which XMLBuilder omits from output
    expect(parsedOutput.repomix.git_logs.commit_graph.merge_commits).toBeUndefined();
    // With single commit, fast-xml-parser returns object directly (not array)
    const commit = Array.isArray(parsedOutput.repomix.git_logs.commits)
      ? parsedOutput.repomix.git_logs.commits[0]
      : parsedOutput.repomix.git_logs.commits;
    expect(commit['@_hash']).toBe('abc1234567890abcdef');
    expect(commit.author.name).toBe('Jane Smith');
    expect(commit.files).toBe('src/bugfix.ts');
  });

  test('generateOutput should include files list in XML commit history template', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.xml',
        style: 'xml',
        parsableStyle: false,
        git: { includeLogs: true, includeCommitGraph: true, includeCommitPatches: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const mockGitLogResult = {
      summary: {
        totalCommits: 1,
        mergeCommits: 0,
        range: 'HEAD~1..HEAD',
        detailLevel: 'stat' as const,
      },
      commits: [
        {
          metadata: {
            hash: 'abc1234567890',
            abbreviatedHash: 'abc123',
            parents: [],
            author: { name: 'Test', email: 'test@example.com', date: '2025-11-20T12:00:00Z' },
            committer: { name: 'Test', email: 'test@example.com', date: '2025-11-20T12:00:00Z' },
            message: 'test commit',
            body: '',
            files: ['src/a.ts', 'src/b.ts', 'tests/a.test.ts'],
          },
          patch: '',
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

    expect(output).toContain('<files>');
    expect(output).toContain('<file>src/a.ts</file>');
    expect(output).toContain('<file>src/b.ts</file>');
    expect(output).toContain('<file>tests/a.test.ts</file>');
    expect(output).toContain('</files>');
  });

  test('generateOutput should include merge_commits in parsable XML commit_graph', async () => {
    const mockConfig = createMockConfig({
      output: {
        filePath: 'output.xml',
        style: 'xml',
        parsableStyle: true,
        git: { includeLogs: true, includeCommitGraph: true, includeCommitPatches: true },
      },
    });
    const mockProcessedFiles: ProcessedFile[] = [{ path: 'file1.txt', content: 'content1' }];
    const mockGitLogResult = {
      summary: {
        totalCommits: 2,
        mergeCommits: 1,
        range: 'HEAD~2..HEAD',
        detailLevel: 'stat' as const,
      },
      graph: {
        commits: [],
        graph: '* merge123 Merge branch\n* abc123 feat: feature',
        mermaidGraph: 'gitGraph\n  commit id: "abc123: feat: feature"',
        mergeCommits: ['merge1234567890'],
        tags: {},
      },
      commits: [
        {
          metadata: {
            hash: 'merge1234567890',
            abbreviatedHash: 'merge123',
            parents: ['parent1', 'parent2'],
            author: { name: 'Test', email: 'test@example.com', date: '2025-11-21T12:00:00Z' },
            committer: { name: 'Test', email: 'test@example.com', date: '2025-11-21T12:00:00Z' },
            message: 'Merge branch',
            body: '',
            files: [],
          },
          patch: '',
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

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedOutput = parser.parse(output);

    expect(parsedOutput.repomix.git_logs.commit_graph.merge_commits).toBe('merge1234567890');
  });
});
