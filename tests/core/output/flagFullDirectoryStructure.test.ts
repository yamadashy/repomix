import { describe, expect, test } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { buildOutputGeneratorContext } from '../../../src/core/output/outputGenerate.js';

const createMockConfig = (overrides: Partial<RepomixConfigMerged> = {}): RepomixConfigMerged => ({
  cwd: '/repo',
  input: { maxFileSize: 1024 * 1024 },
  output: {
    filePath: 'repomix-output.json',
    style: 'json',
    parsableStyle: false,
    headerText: undefined,
    instructionFilePath: undefined,
    fileSummary: true,
    directoryStructure: true,
    files: true,
    removeComments: false,
    removeEmptyLines: false,
    compress: false,
    topFilesLength: 5,
    showLineNumbers: false,
    truncateBase64: false,
    copyToClipboard: false,
    includeEmptyDirectories: false,
    includeFullDirectoryStructure: true,
    tokenCountTree: false,
    git: {
      sortByChanges: false,
      sortByChangesMaxCommits: 10,
      includeDiffs: false,
      includeLogs: false,
      includeLogsCount: 5,
    },
  },
  include: ['src/**/*.ts'],
  ignore: {
    useGitignore: true,
    useDotIgnore: true,
    useDefaultPatterns: true,
    customPatterns: [],
  },
  security: {
    enableSecurityCheck: true,
  },
  tokenCount: {
    encoding: 'cl100k_base',
  },
  ...overrides,
});

describe('includeFullDirectoryStructure flag', () => {
  test('renders full repository tree including root-level files when flag is enabled and include patterns present', async () => {
    const config = createMockConfig();
    const processedFiles: ProcessedFile[] = [{ path: 'src/a/index.ts', content: 'export const a = 1;\n' }];
    const allFilePaths = processedFiles.map((f) => f.path);

    const deps = {
      // Return a directory set that includes paths outside of the included files
      listDirectories: async () => ['src', 'src/a', 'src/b', 'docs', 'docs/guide'],
      // Files across the repo (subject to ignores)
      listFiles: async () => ['README.md', 'LICENSE.md', 'src/a/index.ts', 'src/b/other.ts', 'docs/guide/intro.md'],
      // Not used in full-tree branch, but included for completeness
      searchFiles: async () => ({ filePaths: allFilePaths, emptyDirPaths: [] }),
    };

    const ctx = await buildOutputGeneratorContext(
      ['/repo'],
      config,
      allFilePaths,
      processedFiles,
      undefined,
      undefined,
      undefined,
      deps,
    );

    // Expect the tree to include root-level files beyond those derived from included files
    expect(ctx.treeString).toContain('README.md');
    expect(ctx.treeString).toContain('LICENSE.md');
    // Expect directories beyond those derived from files
    expect(ctx.treeString).toContain('docs');
    expect(ctx.treeString).toContain('src');
    // Should still include the file name within the tree
    expect(ctx.treeString).toContain('index.ts');
  });

  test('does not render full tree when include is empty even if flag is enabled', async () => {
    const config = createMockConfig({ include: [] });
    const processedFiles: ProcessedFile[] = [{ path: 'src/a/index.ts', content: 'export const a = 1;\n' }];
    const allFilePaths = processedFiles.map((f) => f.path);

    const deps = {
      // Would return extra directories if called, but should NOT be used in this case
      listDirectories: async () => ['src', 'src/a', 'docs', 'docs/guide'],
      listFiles: async () => ['README.md', 'LICENSE.md'],
      searchFiles: async () => ({ filePaths: allFilePaths, emptyDirPaths: [] }),
    };

    const ctx = await buildOutputGeneratorContext(
      ['/repo'],
      config,
      allFilePaths,
      processedFiles,
      undefined,
      undefined,
      undefined,
      deps,
    );

    // Should not include directories/files outside of file-derived tree ('docs' and root files should not appear)
    expect(ctx.treeString).not.toContain('docs');
    expect(ctx.treeString).not.toContain('README.md');
    expect(ctx.treeString).not.toContain('LICENSE.md');
    // Should include the file-derived structure
    expect(ctx.treeString).toContain('src');
    expect(ctx.treeString).toContain('index.ts');
  });
});
