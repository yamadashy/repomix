import { describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { generateOutput } from '../../../src/core/output/outputGenerate.js';
import type { RenderContext } from '../../../src/core/output/outputGeneratorTypes.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('Output Generation with Diffs', () => {
  const mockProcessedFiles = [
    {
      path: 'file1.ts',
      content: 'console.log("file1");',
      relativeMetrics: {
        characters: 10,
        tokens: 5,
      },
    },
  ];

  const sampleDiff = `diff --git a/file.ts b/file.ts
  index 1234567..abcdefg 100644
  --- a/file.ts
  +++ b/file.ts
  @@ -1,5 +1,5 @@
   const a = 1;
  -const b = 2;
  +const b = 3;
   const c = 3;`;

  const allFilePaths = ['file1.ts'];
  const rootDirs = ['/test/repo'];

  // Create a mock config for testing
  const mockConfig: RepomixConfigMerged = createMockConfig({
    cwd: '/test',
    output: {
      files: true,
      directoryStructure: true,
      fileSummary: true,
      style: 'xml',
      git: {
        includeDiffs: true,
      },
    },
  });

  const gitDiffResult: GitDiffResult = {
    workTreeDiffContent: sampleDiff,
    stagedDiffContent: '',
  };

  // Mock dependencies
  const mockDeps = {
    buildOutputGeneratorContext: vi.fn().mockImplementation(async () => ({
      generationDate: '2025-05-05T12:00:00Z',
      treeString: 'mock-tree',
      processedFiles: mockProcessedFiles,
      config: mockConfig,
      instruction: '',
      gitDiffResult,
    })),
    generateDirectXmlOutput: vi.fn(),
    generateDirectMarkdownOutput: vi.fn(),
    generateDirectPlainOutput: vi.fn(),
    generateHandlebarOutput: vi.fn(),
    generateParsableXmlOutput: vi.fn(),
    generateParsableJsonOutput: vi.fn(),
  };

  test('XML style output should include diffs section when includeDiffs is enabled', async () => {
    // Explicitly set XML style and parsable to false to use the direct XML builder
    mockConfig.output.style = 'xml';
    mockConfig.output.parsableStyle = false;

    // Mock the direct XML output function to check for diffs
    mockDeps.generateDirectXmlOutput.mockImplementation((outputGeneratorContext) => {
      // Verify that the context has the gitDiffResult
      expect(outputGeneratorContext.gitDiffResult?.workTreeDiffContent).toBe(sampleDiff);

      // Simulate the rendered output to check later
      return {
        output: `<diffs>${outputGeneratorContext.gitDiffResult?.workTreeDiffContent}</diffs>`,
        outputWrapper: null,
      };
    });

    // Generate the output
    const result = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      gitDiffResult,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(result.output).toContain('<diffs>');
    expect(result.output).toContain(sampleDiff);
    expect(result.output).toContain('</diffs>');

    // Verify that the generateDirectXmlOutput function was called
    expect(mockDeps.generateDirectXmlOutput).toHaveBeenCalled();
  });

  test('XML style output with parsableStyle should include diffs section', async () => {
    // Set XML style and parsable to true
    mockConfig.output.style = 'xml';
    mockConfig.output.parsableStyle = true;

    // Mock the parsable XML output function
    mockDeps.generateParsableXmlOutput.mockImplementation((renderContext: RenderContext) => {
      // Verify that the renderContext has the gitDiffs property
      expect(renderContext.gitDiffWorkTree).toBe(sampleDiff);

      // Simulate the XML output
      return Promise.resolve(`<repomix><diffs>${renderContext.gitDiffWorkTree}</diffs></repomix>`);
    });

    // Generate the output
    const result = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(result.output).toContain('<repomix><diffs>');
    expect(result.output).toContain(sampleDiff);
    expect(result.output).toContain('</diffs></repomix>');

    // Verify that the generateParsableXmlOutput function was called
    expect(mockDeps.generateParsableXmlOutput).toHaveBeenCalled();
  });

  test('Markdown style output should include diffs section when includeDiffs is enabled', async () => {
    // Set markdown style
    mockConfig.output.style = 'markdown';
    mockConfig.output.parsableStyle = false;

    // Mock the direct markdown output function
    mockDeps.generateDirectMarkdownOutput.mockImplementation((outputGeneratorContext) => {
      // Verify that the context has the gitDiffResult
      expect(outputGeneratorContext.gitDiffResult?.workTreeDiffContent).toBe(sampleDiff);

      // Simulate the markdown output
      return {
        output: `# Git Diffs\n\`\`\`diff\n${outputGeneratorContext.gitDiffResult?.workTreeDiffContent}\n\`\`\``,
        outputWrapper: null,
      };
    });

    // Generate the output
    const result = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(result.output).toContain('# Git Diffs');
    expect(result.output).toContain('```diff');
    expect(result.output).toContain(sampleDiff);
    expect(result.output).toContain('```');

    // Verify that the generateDirectMarkdownOutput function was called
    expect(mockDeps.generateDirectMarkdownOutput).toHaveBeenCalled();
  });

  test('Plain style output should include diffs section when includeDiffs is enabled', async () => {
    // Set plain style
    mockConfig.output.style = 'plain';
    mockConfig.output.parsableStyle = false;

    // Mock the direct plain output function
    mockDeps.generateDirectPlainOutput.mockImplementation((outputGeneratorContext) => {
      expect(outputGeneratorContext.gitDiffResult?.workTreeDiffContent).toBe(sampleDiff);

      // Simulate the plain text output
      return {
        output: `===============\nGit Diffs\n===============\n${outputGeneratorContext.gitDiffResult?.workTreeDiffContent}`,
        outputWrapper: null,
      };
    });

    // Generate the output
    const result = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(result.output).toContain('===============\nGit Diffs\n===============');
    expect(result.output).toContain(sampleDiff);

    // Verify that the generateDirectPlainOutput function was called
    expect(mockDeps.generateDirectPlainOutput).toHaveBeenCalled();
  });

  test('Output should not include diffs section when includeDiffs is disabled', async () => {
    // Reset to XML style (may have been changed by prior tests)
    mockConfig.output.style = 'xml';
    mockConfig.output.parsableStyle = false;

    // Disable the includeDiffs option
    if (mockConfig.output.git) {
      mockConfig.output.git.includeDiffs = false;
    }

    // Update the mock to not include diffs
    mockDeps.buildOutputGeneratorContext.mockImplementationOnce(async () => ({
      generationDate: '2025-05-05T12:00:00Z',
      treeString: 'mock-tree',
      processedFiles: mockProcessedFiles,
      config: mockConfig,
      instruction: '',
      // No gitDiffs property
    }));

    // Mock the direct XML output function (XML non-parsable is the default style)
    mockDeps.generateDirectXmlOutput.mockImplementation((outputGeneratorContext) => {
      // Verify that the context does not have the gitDiffResult
      expect(outputGeneratorContext.gitDiffResult).toBeUndefined();

      // Simulate the output without diffs
      return { output: 'Output without diffs', outputWrapper: null };
    });

    // Generate the output
    const result = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are not included in the output
    expect(result.output).not.toContain('Git Diffs');
    expect(result.output).not.toContain(sampleDiff);

    // Verify that the generateDirectXmlOutput function was called
    expect(mockDeps.generateDirectXmlOutput).toHaveBeenCalled();
  });
});
