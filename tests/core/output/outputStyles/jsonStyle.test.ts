import { describe, expect, test } from 'vitest';
import type { RepomixConfigMerged } from '../../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../../src/core/file/fileTypes.js';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';

const createMockConfig = (overrides: Partial<RepomixConfigMerged> = {}): RepomixConfigMerged => ({
  cwd: '/test',
  input: { maxFileSize: 1024 * 1024 },
  output: {
    filePath: 'test-output.json',
    style: 'json' as const,
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
    includeFullDirectoryStructure: false,
    tokenCountTree: false,
    git: {
      sortByChanges: false,
      sortByChangesMaxCommits: 10,
      includeDiffs: false,
      includeLogs: false,
      includeLogsCount: 5,
    },
  },
  include: [],
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

const createMockProcessedFiles = (): ProcessedFile[] => [
  {
    path: 'src/index.ts',
    content: 'console.log("Hello");',
  },
  {
    path: 'package.json',
    content: '{"name": "test"}',
  },
];

describe('JSON Output Style', () => {
  test('should generate valid JSON output', async () => {
    const config = createMockConfig();
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  test('should include fileSummary when enabled', async () => {
    const config = createMockConfig({
      output: {
        ...createMockConfig().output,
        fileSummary: true,
      },
    });
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);
    const parsed = JSON.parse(result);

    expect(parsed.fileSummary).toBeDefined();
    expect(parsed.fileSummary.purpose).toBeDefined();
  });

  test('should not include fileSummary when disabled', async () => {
    const config = createMockConfig({
      output: {
        ...createMockConfig().output,
        fileSummary: false,
      },
    });
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);
    const parsed = JSON.parse(result);

    expect(parsed.fileSummary).toBeUndefined();
  });

  test('should include files when enabled', async () => {
    const config = createMockConfig({
      output: {
        ...createMockConfig().output,
        files: true,
      },
    });
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);
    const parsed = JSON.parse(result);

    expect(parsed.files).toBeDefined();
    expect(parsed.files['src/index.ts']).toBe('console.log("Hello");');
    expect(parsed.files['package.json']).toBe('{"name": "test"}');
  });

  test('should handle special characters in file content', async () => {
    const config = createMockConfig();
    const processedFiles: ProcessedFile[] = [
      {
        path: 'test.js',
        content: 'const str = "Hello "world"\nNew line\tTab";',
      },
    ];
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed = JSON.parse(result);
    expect(parsed.files['test.js']).toBe('const str = "Hello "world"\nNew line\tTab";');
  });
});
