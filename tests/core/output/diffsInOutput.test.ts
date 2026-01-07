import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import * as gitDiffModule from '../../../src/core/git/gitDiffHandle.js';
import * as gitRepositoryModule from '../../../src/core/git/gitRepositoryHandle.js';
import { buildOutputGeneratorContext, generateOutput } from '../../../src/core/output/outputGenerate.js';
import type { RenderContext } from '../../../src/core/output/outputGeneratorTypes.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Mock the git modules
vi.mock('../../../src/core/git/gitDiffHandle.js', () => ({
  getWorkTreeDiff: vi.fn(),
}));

vi.mock('../../../src/core/git/gitRepositoryHandle.js', () => ({
  isGitRepository: vi.fn(),
}));

describe('Git Diffs in Output', () => {
  const sampleDiff = `diff --git a/file1.js b/file1.js
index 123..456 100644
--- a/file1.js
+++ b/file1.js
@@ -1,5 +1,5 @@
-old line
+new line`;

  let mockConfig: RepomixConfigMerged;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock the git command
    vi.mocked(gitDiffModule.getWorkTreeDiff).mockResolvedValue(sampleDiff);
    vi.mocked(gitRepositoryModule.isGitRepository).mockResolvedValue(true);

    // Sample minimal config using createMockConfig utility
    mockConfig = createMockConfig({
      cwd: '/test/repo',
      input: {
        maxFileSize: 1000000,
      },
      output: {
        filePath: 'output.txt',
        style: 'plain',
        git: {
          includeDiffs: false,
        },
      },
    });
  });

  test('buildOutputGeneratorContext should include diffs when enabled', async () => {
    // Enable diffs
    if (mockConfig.output.git) {
      mockConfig.output.git.includeDiffs = true;
    }

    const rootDirs = ['/test/repo'];
    const allFilePaths = ['file1.js', 'file2.js'];
    const processedFiles: ProcessedFile[] = [
      {
        path: 'file1.js',
        content: 'console.log("file1");',
      },
      {
        path: 'file2.js',
        content: 'console.log("file2");',
      },
    ];

    const sampleDiff = 'diff --git a/file1.js b/file1.js';

    const context = await buildOutputGeneratorContext(rootDirs, mockConfig, allFilePaths, processedFiles, {
      workTreeDiffContent: sampleDiff,
      stagedDiffContent: '',
    });

    // Context should include gitDiffs
    expect(context.gitDiffResult?.workTreeDiffContent).toBe(sampleDiff);
  });

  test('generateOutput should include diffs in XML output via object', async () => {
    // Enable diffs
    mockConfig.output.style = 'xml';
    if (mockConfig.output.git) {
      mockConfig.output.git.includeDiffs = true;
    }

    const rootDirs = ['/test/repo'];
    const processedFiles: ProcessedFile[] = [
      {
        path: 'file1.js',
        content: 'console.log("file1");',
      },
    ];

    // Create a modified generateOutput with mocked deps
    const mockBuildOutputGeneratorContext = vi.fn().mockImplementation(async () => {
      return {
        generationDate: '2025-05-06T00:00:00.000Z',
        treeString: '.\n└── file1.js',
        processedFiles,
        config: mockConfig,
        instruction: '',
        gitDiffs: sampleDiff,
      };
    });

    const mockGenerateHandlebarOutput = vi.fn().mockResolvedValue('<xml>output with diffs</xml>');
    const mockGenerateParsableXmlOutput = vi.fn().mockImplementation(async (renderContext: RenderContext) => {
      // Check that renderContext has gitDiffs
      expect(renderContext.gitDiffWorkTree).toBe(sampleDiff);
      return '<xml>parsable output with diffs object</xml>';
    });

    const mockSortOutputFiles = vi.fn().mockImplementation((files) => Promise.resolve(files));

    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: sampleDiff,
      stagedDiffContent: '',
    };

    // Call generateOutput with mocked deps
    const _output = await generateOutput(
      rootDirs,
      mockConfig,
      processedFiles,
      ['file1.js'],
      gitDiffResult,
      undefined,
      undefined,
      {
        buildOutputGeneratorContext: mockBuildOutputGeneratorContext,
        generateHandlebarOutput: mockGenerateHandlebarOutput,
        generateParsableXmlOutput: mockGenerateParsableXmlOutput,
        generateParsableJsonOutput: vi.fn(),
        sortOutputFiles: mockSortOutputFiles,
      },
    );

    // Check that the output was generated with the correct template
    expect(mockBuildOutputGeneratorContext).toHaveBeenCalled();

    // For non-parsable XML, should use Handlebars
    if (!mockConfig.output.parsableStyle) {
      expect(mockGenerateHandlebarOutput).toHaveBeenCalled();
    } else {
      // For parsable XML, should use XML generator
      expect(mockGenerateParsableXmlOutput).toHaveBeenCalled();
    }
  });

  test('generateOutput should include diffs in Markdown output', async () => {
    // Enable diffs with markdown style
    mockConfig.output.style = 'markdown';
    if (mockConfig.output.git) {
      mockConfig.output.git.includeDiffs = true;
    }

    const rootDirs = ['/test/repo'];
    const processedFiles: ProcessedFile[] = [
      {
        path: 'file1.js',
        content: 'console.log("file1");',
      },
    ];

    // Create a modified generateOutput with mocked deps
    const mockBuildOutputGeneratorContext = vi.fn().mockImplementation(async () => {
      return {
        generationDate: '2025-05-06T00:00:00.000Z',
        treeString: '.\n└── file1.js',
        processedFiles,
        config: mockConfig,
        instruction: '',
        gitDiffResult: {
          workTreeDiffContent: sampleDiff,
          stagedDiffContent: '',
        },
      };
    });

    const mockGenerateHandlebarOutput = vi.fn().mockImplementation(async (_config, renderContext: RenderContext) => {
      // Check that renderContext has gitDiffs for markdown template
      expect(renderContext.gitDiffWorkTree).toBe(sampleDiff);
      return `# Markdown output with diffs\n\`\`\`diff\n${sampleDiff}\n\`\`\``;
    });

    const mockGenerateParsableXmlOutput = vi.fn();
    const mockSortOutputFiles = vi.fn().mockImplementation((files) => Promise.resolve(files));
    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: sampleDiff,
      stagedDiffContent: '',
    };

    // Call generateOutput with mocked deps
    const _output = await generateOutput(
      rootDirs,
      mockConfig,
      processedFiles,
      ['file1.js'],
      gitDiffResult,
      undefined,
      undefined,
      {
        buildOutputGeneratorContext: mockBuildOutputGeneratorContext,
        generateHandlebarOutput: mockGenerateHandlebarOutput,
        generateParsableXmlOutput: mockGenerateParsableXmlOutput,
        generateParsableJsonOutput: vi.fn(),
        sortOutputFiles: mockSortOutputFiles,
      },
    );

    // For markdown output, should use Handlebars
    expect(mockGenerateHandlebarOutput).toHaveBeenCalled();

    // XML generator should not be called for markdown
    expect(mockGenerateParsableXmlOutput).not.toHaveBeenCalled();
  });
});
