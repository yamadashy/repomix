import type { Stats } from 'node:fs';
import type fs from 'node:fs/promises';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerAttachPackedOutputTool } from '../../../src/mcp/tools/attachPackedOutputTool.js';
import { type MockedDeps, mockOverloaded } from '../../testing/depsDoubles.js';
import { createMcpServerDouble, type McpServerDouble } from '../../testing/mcpServerDoubles.js';

describe('AttachPackedOutputTool', () => {
  let mockServer: McpServerDouble;

  let toolHandler: (args: { path: string; topFilesLength?: number }) => Promise<CallToolResult>;
  let deps: MockedDeps<NonNullable<Parameters<typeof registerAttachPackedOutputTool>[1]>>;
  const errorMessageOf = (result: CallToolResult): string =>
    JSON.parse((result.content[0] as { type: 'text'; text: string }).text).errorMessage;

  const mockXmlContent = `
    <repomix>
      <file path="src/index.js">console.log('Hello');</file>
      <file path="src/utils.js">function helper() {}</file>
      <file path="package.json">{"name":"test"}</file>
    </repomix>
  `;

  beforeEach(() => {
    vi.resetAllMocks();
    deps = {
      stat: mockOverloaded<typeof fs.stat>(),
      access: vi.fn(),
      readFile: mockOverloaded<typeof fs.readFile>(),
      formatPackToolResponse: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Success response' }],
      }),
    };
    deps.stat.mockResolvedValue({ isDirectory: () => false } as Stats);
    deps.readFile.mockResolvedValue(mockXmlContent);
    mockServer = createMcpServerDouble();
    registerAttachPackedOutputTool(mockServer.server, deps);
    toolHandler = mockServer.toolHandler();
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'attach_packed_output',
      expect.any(Object), // tool spec
      expect.any(Function),
    );
  });

  test('should handle XML file path input', async () => {
    const testFilePath = '/test/repomix-output.xml';

    const result = await toolHandler({ path: testFilePath });

    expect(deps.stat).toHaveBeenCalledWith(testFilePath);
    expect(deps.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(deps.formatPackToolResponse).toHaveBeenCalled();
    const expectedFilePaths = ['src/index.js', 'src/utils.js', 'package.json'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');".length,
      'src/utils.js': 'function helper() {}'.length,
      'package.json': '{"name":"test"}'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);
    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 3,
        totalCharacters: totalCharacters,
        totalTokens: Math.floor(totalCharacters / 4),
        safeFilePaths: expectedFilePaths,
        fileCharCounts: expectedCharCounts,
      }),
      testFilePath,
      undefined,
      // Attached files are marked for serve-time secret scanning.
      true,
    );
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Success response' }],
    });
  });

  test('should handle directory path input', async () => {
    const testDirPath = '/test/project';
    const expectedXmlPath = path.join(testDirPath, 'repomix-output.xml');

    deps.stat.mockResolvedValue({
      isDirectory: () => true,
    } as Stats);
    deps.access.mockResolvedValue(undefined);

    const result = await toolHandler({ path: testDirPath });

    expect(deps.stat).toHaveBeenCalledWith(testDirPath);
    expect(deps.access).toHaveBeenCalledWith(expectedXmlPath);
    expect(deps.readFile).toHaveBeenCalledWith(expectedXmlPath, 'utf8');
    expect(deps.formatPackToolResponse).toHaveBeenCalled();
    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'project' },
      expect.anything(),
      expectedXmlPath,
      undefined,
      true,
    );
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Success response' }],
    });
  });

  test('should handle custom topFilesLength option', async () => {
    const testFilePath = '/test/repomix-output.xml';
    const topFilesLength = 20;

    await toolHandler({ path: testFilePath, topFilesLength });

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      testFilePath,
      topFilesLength,
      true,
    );
  });

  test('should handle non-supported file format error', async () => {
    const testFilePath = '/test/not-supported-file.xyz';

    const result = await toolHandler({ path: testFilePath });

    expect(result.isError).toBe(true);
    expect(errorMessageOf(result)).toContain('Unsupported file format: .xyz');
  });

  test('should handle file not found error', async () => {
    const testFilePath = '/test/non-existent.xml';

    deps.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const result = await toolHandler({ path: testFilePath });

    expect(result.isError).toBe(true);
    expect(errorMessageOf(result)).toBe(`File or directory not found for path: ${testFilePath}`);
  });

  test('should handle read file error', async () => {
    const testFilePath = '/test/repomix-output.xml';

    deps.readFile.mockRejectedValue(new Error('Failed to read file'));

    const result = await toolHandler({ path: testFilePath });

    expect(result.isError).toBe(true);
    expect(errorMessageOf(result)).toBe('Failed to read file');
  });

  test('should extract file paths correctly from XML content', async () => {
    const testFilePath = '/test/repomix-output.xml';

    await toolHandler({ path: testFilePath });

    const formatPackToolResponseCalls = deps.formatPackToolResponse.mock.calls;
    expect(formatPackToolResponseCalls.length).toBeGreaterThan(0);

    // Check that the second argument (packResult) contains the expected file paths
    const packResult = formatPackToolResponseCalls[formatPackToolResponseCalls.length - 1][1];
    expect(packResult).toHaveProperty('safeFilePaths');
    expect(packResult.safeFilePaths).toEqual(['src/index.js', 'src/utils.js', 'package.json']);
  });

  test('should mark attached outputs for serve-time secret scanning', async () => {
    // The attach path does not scan or return content itself; instead it flags the
    // registered output so read_repomix_output / grep_repomix_output secret-scan it
    // before serving. The scan flags recognized secret formats; it does not restrict
    // which file the path points at.
    const testFilePath = '/test/repomix-output.xml';

    await toolHandler({ path: testFilePath });

    const calls = deps.formatPackToolResponse.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // The requiresSecretScan flag (5th argument) must be true.
    expect(calls[calls.length - 1][4]).toBe(true);
  });

  test('should handle directory without repomix-output.xml', async () => {
    const testDirPath = '/test/empty-project';

    deps.stat.mockResolvedValue({
      isDirectory: () => true,
    } as Stats);
    deps.access.mockRejectedValue(new Error('ENOENT: no such file'));

    const result = await toolHandler({ path: testDirPath });

    expect(result.isError).toBe(true);
    expect(errorMessageOf(result)).toContain(`No repomix output file found in directory: ${testDirPath}`);
  });

  test('should handle malformed XML by returning zero metrics', async () => {
    const testFilePath = '/test/repomix-output.xml';
    const malformedXml = '<repomix><file path="test.js">unclosed tag</repomix>';

    deps.readFile.mockResolvedValue(malformedXml);

    await toolHandler({ path: testFilePath });

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 0,
        totalCharacters: 0,
        totalTokens: 0,
        safeFilePaths: [],
        fileCharCounts: {},
      }),
      testFilePath,
      undefined,
      true,
    );
  });

  test('should handle Markdown file path input', async () => {
    const testFilePath = '/test/repomix-output.md';
    const markdownContent = `
# Files

## File: src/index.js
\`\`\`javascript
console.log('Hello');
\`\`\`

## File: src/utils.js
\`\`\`javascript
function helper() {}
\`\`\`
    `;

    deps.readFile.mockResolvedValue(markdownContent);

    await toolHandler({ path: testFilePath });

    expect(deps.stat).toHaveBeenCalledWith(testFilePath);
    expect(deps.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(deps.formatPackToolResponse).toHaveBeenCalled();

    const expectedFilePaths = ['src/index.js', 'src/utils.js'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');\n".length,
      'src/utils.js': 'function helper() {}\n'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 2,
        totalCharacters: totalCharacters,
        totalTokens: Math.floor(totalCharacters / 4),
        safeFilePaths: expectedFilePaths,
        fileCharCounts: expectedCharCounts,
      }),
      testFilePath,
      undefined,
      true,
    );
  });

  test('should handle Plain text file path input', async () => {
    const testFilePath = '/test/repomix-output.txt';
    const plainContent = `
================
File: src/index.js
================
console.log('Hello');

================
File: src/utils.js
================
function helper() {}
    `;

    deps.readFile.mockResolvedValue(plainContent);

    await toolHandler({ path: testFilePath });

    expect(deps.stat).toHaveBeenCalledWith(testFilePath);
    expect(deps.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(deps.formatPackToolResponse).toHaveBeenCalled();

    const expectedFilePaths = ['src/index.js', 'src/utils.js'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');".length,
      'src/utils.js': 'function helper() {}'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 2,
        totalCharacters: totalCharacters,
        totalTokens: Math.floor(totalCharacters / 4),
        safeFilePaths: expectedFilePaths,
        fileCharCounts: expectedCharCounts,
      }),
      testFilePath,
      undefined,
      true,
    );
  });

  test('should handle JSON file path input', async () => {
    const testFilePath = '/test/repomix-output.json';
    const jsonContent = JSON.stringify({
      files: {
        'src/index.js': "console.log('Hello');",
        'src/utils.js': 'function helper() {}',
        'package.json': '{"name":"test"}',
      },
    });

    deps.readFile.mockResolvedValue(jsonContent);

    await toolHandler({ path: testFilePath });

    expect(deps.stat).toHaveBeenCalledWith(testFilePath);
    expect(deps.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(deps.formatPackToolResponse).toHaveBeenCalled();

    const expectedFilePaths = ['src/index.js', 'src/utils.js', 'package.json'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');".length,
      'src/utils.js': 'function helper() {}'.length,
      'package.json': '{"name":"test"}'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 3,
        totalCharacters: totalCharacters,
        totalTokens: Math.floor(totalCharacters / 4),
        safeFilePaths: expectedFilePaths,
        fileCharCounts: expectedCharCounts,
      }),
      testFilePath,
      undefined,
      true,
    );
  });

  test('should handle malformed JSON by returning zero metrics', async () => {
    const testFilePath = '/test/repomix-output.json';
    const malformedJson = '{"files": {"test.js": "content"'; // missing closing braces

    deps.readFile.mockResolvedValue(malformedJson);

    await toolHandler({ path: testFilePath });

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 0,
        totalCharacters: 0,
        totalTokens: 0,
        safeFilePaths: [],
        fileCharCounts: {},
      }),
      testFilePath,
      undefined,
      true,
    );
  });

  test('should handle CRLF line endings in Markdown format', async () => {
    const testFilePath = '/test/repomix-output.md';
    const markdownContentWithCRLF = `# Files\r\n\r\n## File: src/index.js\r\n\`\`\`javascript\r\nconsole.log('Hello');\r\n\`\`\`\r\n\r\n## File: src/utils.js\r\n\`\`\`javascript\r\nfunction helper() {}\r\n\`\`\``;

    deps.readFile.mockResolvedValue(markdownContentWithCRLF);

    await toolHandler({ path: testFilePath });

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 2,
        safeFilePaths: ['src/index.js', 'src/utils.js'],
        fileCharCounts: {
          'src/index.js': "console.log('Hello');\r\n".length,
          'src/utils.js': 'function helper() {}\r\n'.length,
        },
      }),
      testFilePath,
      undefined,
      true,
    );
  });

  test('should handle CRLF line endings in Plain text format', async () => {
    const testFilePath = '/test/repomix-output.txt';
    const plainContentWithCRLF = `================\r\nFile: src/index.js\r\n================\r\nconsole.log('Hello');\r\n\r\n================\r\nFile: src/utils.js\r\n================\r\nfunction helper() {}`;

    deps.readFile.mockResolvedValue(plainContentWithCRLF);

    await toolHandler({ path: testFilePath });

    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.objectContaining({
        totalFiles: 2,
        safeFilePaths: ['src/index.js', 'src/utils.js'],
        fileCharCounts: {
          'src/index.js': "console.log('Hello');".length,
          'src/utils.js': 'function helper() {}'.length,
        },
      }),
      testFilePath,
      undefined,
      true,
    );
  });
});
