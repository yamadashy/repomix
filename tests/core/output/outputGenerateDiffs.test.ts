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
    generateHandlebarOutput: vi.fn(),
    generateParsableXmlOutput: vi.fn(),
    generateParsableJsonOutput: vi.fn(),
    sortOutputFiles: vi.fn().mockResolvedValue(mockProcessedFiles),
  };

  test('XML style output should include diffs section when includeDiffs is enabled', async () => {
    // Explicitly set XML style and parsable to false to use the template
    mockConfig.output.style = 'xml';
    mockConfig.output.parsableStyle = false;

    // Mock the Handlebars output function to check for diffs in the template
    mockDeps.generateHandlebarOutput.mockImplementation((_config, renderContext: RenderContext, _processedFiles) => {
      // Verify that the renderContext has the gitDiffs property
      expect(renderContext.gitDiffWorkTree).toBe(sampleDiff);

      // Simulate the rendered output to check later
      return `<diffs>${renderContext.gitDiffWorkTree}</diffs>`;
    });

    // Generate the output
    const output = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      gitDiffResult,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(output).toContain('<diffs>');
    expect(output).toContain(sampleDiff);
    expect(output).toContain('</diffs>');

    // Verify that the generateHandlebarOutput function was called
    expect(mockDeps.generateHandlebarOutput).toHaveBeenCalled();
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
      return `<repomix><diffs>${renderContext.gitDiffWorkTree}</diffs></repomix>`;
    });

    // Generate the output
    const output = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(output).toContain('<repomix><diffs>');
    expect(output).toContain(sampleDiff);
    expect(output).toContain('</diffs></repomix>');

    // Verify that the generateParsableXmlOutput function was called
    expect(mockDeps.generateParsableXmlOutput).toHaveBeenCalled();
  });

  test('Markdown style output should include diffs section when includeDiffs is enabled', async () => {
    // Set markdown style
    mockConfig.output.style = 'markdown';
    mockConfig.output.parsableStyle = false;

    // Mock the Handlebars output function for markdown
    mockDeps.generateHandlebarOutput.mockImplementation((_config, renderContext: RenderContext, _processedFiles) => {
      // Verify that the renderContext has the gitDiffs property
      expect(renderContext.gitDiffWorkTree).toBe(sampleDiff);

      // Simulate the markdown output
      return `# Git Diffs\n\`\`\`diff\n${renderContext.gitDiffWorkTree}\n\`\`\``;
    });

    // Generate the output
    const output = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(output).toContain('# Git Diffs');
    expect(output).toContain('```diff');
    expect(output).toContain(sampleDiff);
    expect(output).toContain('```');

    // Verify that the generateHandlebarOutput function was called
    expect(mockDeps.generateHandlebarOutput).toHaveBeenCalled();
  });

  test('Plain style output should include diffs section when includeDiffs is enabled', async () => {
    // Set plain style
    mockConfig.output.style = 'plain';
    mockConfig.output.parsableStyle = false;

    // Mock the Handlebars output function for plain text
    mockDeps.generateHandlebarOutput.mockImplementation((_config, renderContext: RenderContext, _processedFiles) => {
      expect(renderContext.gitDiffWorkTree).toBe(sampleDiff);

      // Simulate the plain text output
      return `===============\nGit Diffs\n===============\n${renderContext.gitDiffWorkTree}`;
    });

    // Generate the output
    const output = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are included in the output
    expect(output).toContain('===============\nGit Diffs\n===============');
    expect(output).toContain(sampleDiff);

    // Verify that the generateHandlebarOutput function was called
    expect(mockDeps.generateHandlebarOutput).toHaveBeenCalled();
  });

  test('Output should not include diffs section when includeDiffs is disabled', async () => {
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

    // Mock the Handlebars output function
    mockDeps.generateHandlebarOutput.mockImplementation((_config, renderContext: RenderContext, _processedFiles) => {
      // Verify that the renderContext does not have the gitDiffs property
      expect(renderContext.gitDiffWorkTree).toBeUndefined();

      // Simulate the output without diffs
      return 'Output without diffs';
    });

    // Generate the output
    const output = await generateOutput(
      rootDirs,
      mockConfig,
      mockProcessedFiles,
      allFilePaths,
      undefined,
      undefined,
      undefined,
      mockDeps,
    );

    // Verify the diffs are not included in the output
    expect(output).not.toContain('Git Diffs');
    expect(output).not.toContain(sampleDiff);

    // Verify that the generateHandlebarOutput function was called
    expect(mockDeps.generateHandlebarOutput).toHaveBeenCalled();
  });
});
