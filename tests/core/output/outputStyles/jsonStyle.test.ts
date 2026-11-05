import { describe, expect, test } from 'vitest';
import type { RepomixConfigMerged } from '../../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../../src/core/file/fileTypes.js';
import { generateOutput } from '../../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../../testing/testUtils.js';

// Only the fields these tests depend on differ from the shared defaults.
const createJsonConfig = (
  output: NonNullable<Parameters<typeof createMockConfig>[0]>['output'] = {},
): RepomixConfigMerged =>
  createMockConfig({
    cwd: '/test',
    output: {
      filePath: 'test-output.json',
      style: 'json',
      git: { sortByChanges: false },
      ...output,
    },
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
    const config = createJsonConfig();
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);

    // Should be valid JSON
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toEqual(['fileSummary', 'directoryStructure', 'files']);
    expect(parsed.directoryStructure).toBe('src/\n  index.ts\npackage.json');
  });

  test('should include fileSummary when enabled', async () => {
    const config = createJsonConfig({ fileSummary: true });
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);
    const parsed = JSON.parse(result);

    expect(Object.keys(parsed.fileSummary)).toEqual([
      'generationHeader',
      'purpose',
      'fileFormat',
      'usageGuidelines',
      'notes',
    ]);
    expect(parsed.fileSummary.purpose).toBe(
      "This file contains a packed representation of the entire repository's contents.\n" +
        'It is designed to be easily consumable by AI systems for analysis, code review,\n' +
        'or other automated processes.',
    );
  });

  test('should not include fileSummary when disabled', async () => {
    const config = createJsonConfig({ fileSummary: false });
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);
    const parsed = JSON.parse(result);

    expect(parsed.fileSummary).toBeUndefined();
  });

  test('should include files when enabled', async () => {
    const config = createJsonConfig({ files: true });
    const processedFiles = createMockProcessedFiles();
    const allFilePaths = processedFiles.map((f) => f.path);

    const result = await generateOutput(['/test'], config, processedFiles, allFilePaths);
    const parsed = JSON.parse(result);

    expect(parsed.files).toEqual({
      'src/index.ts': 'console.log("Hello");',
      'package.json': '{"name": "test"}',
    });
  });

  test('should handle special characters in file content', async () => {
    const config = createJsonConfig();
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
