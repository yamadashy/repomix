import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerAttachPackedOutputTool } from '../../../src/mcp/tools/attachPackedOutputTool.js';
import { buildMcpToolErrorResponse, formatPackToolResponse } from '../../../src/mcp/tools/mcpToolRuntime.js';

vi.mock('node:fs/promises');
vi.mock('node:path');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js', async () => {
  const actual = await vi.importActual('../../../src/mcp/tools/mcpToolRuntime.js');
  return {
    ...actual,
    formatPackToolResponse: vi.fn(),
    buildMcpToolErrorResponse: vi.fn(),
  };
});

describe('AttachPackedOutputTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: { path: string; topFilesLength?: number }) => Promise<CallToolResult>;

  const mockXmlContent = `
    <repomix>
      <file path="src/index.js">console.log('Hello');</file>
      <file path="src/utils.js">function helper() {}</file>
      <file path="package.json">{"name":"test"}</file>
    </repomix>
  `;

  beforeEach(() => {
    vi.resetAllMocks();
    registerAttachPackedOutputTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    // Mock path functions
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.basename).mockImplementation((p) => p.split('/').pop() || '');
    vi.mocked(path.dirname).mockImplementation((p) => p.split('/').slice(0, -1).join('/') || '.');
    vi.mocked(path.extname).mockImplementation((p) => {
      const parts = p.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });

    // Mock fs functions
    vi.mocked(fs.stat).mockResolvedValue({
      isDirectory: () => false,
    } as unknown as Stats);
    vi.mocked(fs.readFile).mockResolvedValue(mockXmlContent);

    // Mock mcpToolRuntime functions
    vi.mocked(formatPackToolResponse).mockResolvedValue({
      content: [{ type: 'text', text: 'Success response' }],
    });
    vi.mocked(buildMcpToolErrorResponse).mockReturnValue({
      isError: true,
      content: [{ type: 'text', text: '{"errorMessage":"Error occurred"}' }],
    });
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

    expect(fs.stat).toHaveBeenCalledWith(testFilePath);
    expect(fs.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(formatPackToolResponse).toHaveBeenCalled();
    const expectedFilePaths = ['src/index.js', 'src/utils.js', 'package.json'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');".length,
      'src/utils.js': 'function helper() {}'.length,
      'package.json': '{"name":"test"}'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);
    expect(formatPackToolResponse).toHaveBeenCalledWith(
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
    const expectedXmlPath = '/test/project/repomix-output.xml';

    vi.mocked(fs.stat).mockResolvedValue({
      isDirectory: () => true,
    } as unknown as Stats);
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await toolHandler({ path: testDirPath });

    expect(fs.stat).toHaveBeenCalledWith(testDirPath);
    expect(fs.access).toHaveBeenCalledWith(expectedXmlPath);
    expect(fs.readFile).toHaveBeenCalledWith(expectedXmlPath, 'utf8');
    expect(formatPackToolResponse).toHaveBeenCalled();
    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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
    expect(buildMcpToolErrorResponse).toHaveBeenCalled();
  });

  test('should handle file not found error', async () => {
    const testFilePath = '/test/non-existent.xml';

    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const result = await toolHandler({ path: testFilePath });

    expect(result.isError).toBe(true);
    expect(buildMcpToolErrorResponse).toHaveBeenCalled();
  });

  test('should handle read file error', async () => {
    const testFilePath = '/test/repomix-output.xml';

    vi.mocked(fs.readFile).mockRejectedValue(new Error('Failed to read file'));

    const result = await toolHandler({ path: testFilePath });

    expect(result.isError).toBe(true);
    expect(buildMcpToolErrorResponse).toHaveBeenCalled();
  });

  test('should extract file paths correctly from XML content', async () => {
    const testFilePath = '/test/repomix-output.xml';

    await toolHandler({ path: testFilePath });

    const formatPackToolResponseCalls = vi.mocked(formatPackToolResponse).mock.calls;
    expect(formatPackToolResponseCalls.length).toBeGreaterThan(0);

    // Check that the second argument (packResult) contains the expected file paths
    const packResult = formatPackToolResponseCalls[formatPackToolResponseCalls.length - 1][1];
    expect(packResult).toHaveProperty('safeFilePaths');
    expect(packResult.safeFilePaths).toEqual(['src/index.js', 'src/utils.js', 'package.json']);
  });

  test('should mark attached outputs for serve-time secret scanning', async () => {
    // The attach path does not scan or return content itself; instead it flags the
    // registered output so read_repomix_output / grep_repomix_output secret-scan it
    // before serving, matching the file_system_read_file boundary.
    const testFilePath = '/test/repomix-output.xml';

    await toolHandler({ path: testFilePath });

    const calls = vi.mocked(formatPackToolResponse).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // The requiresSecretScan flag (5th argument) must be true.
    expect(calls[calls.length - 1][4]).toBe(true);
  });

  test('should handle directory without repomix-output.xml', async () => {
    const testDirPath = '/test/empty-project';

    vi.mocked(fs.stat).mockResolvedValue({
      isDirectory: () => true,
    } as unknown as Stats);
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT: no such file'));

    const result = await toolHandler({ path: testDirPath });

    expect(result.isError).toBe(true);
    expect(buildMcpToolErrorResponse).toHaveBeenCalled();
  });

  test('should handle malformed XML by returning zero metrics', async () => {
    const testFilePath = '/test/repomix-output.xml';
    const malformedXml = '<repomix><file path="test.js">unclosed tag</repomix>';

    vi.mocked(fs.readFile).mockResolvedValue(malformedXml);

    await toolHandler({ path: testFilePath });

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    vi.mocked(fs.readFile).mockResolvedValue(markdownContent);

    await toolHandler({ path: testFilePath });

    expect(fs.stat).toHaveBeenCalledWith(testFilePath);
    expect(fs.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(formatPackToolResponse).toHaveBeenCalled();

    const expectedFilePaths = ['src/index.js', 'src/utils.js'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');\n".length,
      'src/utils.js': 'function helper() {}\n'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    vi.mocked(fs.readFile).mockResolvedValue(plainContent);

    await toolHandler({ path: testFilePath });

    expect(fs.stat).toHaveBeenCalledWith(testFilePath);
    expect(fs.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(formatPackToolResponse).toHaveBeenCalled();

    const expectedFilePaths = ['src/index.js', 'src/utils.js'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');".length,
      'src/utils.js': 'function helper() {}'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    vi.mocked(fs.readFile).mockResolvedValue(jsonContent);

    await toolHandler({ path: testFilePath });

    expect(fs.stat).toHaveBeenCalledWith(testFilePath);
    expect(fs.readFile).toHaveBeenCalledWith(testFilePath, 'utf8');
    expect(formatPackToolResponse).toHaveBeenCalled();

    const expectedFilePaths = ['src/index.js', 'src/utils.js', 'package.json'];
    const expectedCharCounts = {
      'src/index.js': "console.log('Hello');".length,
      'src/utils.js': 'function helper() {}'.length,
      'package.json': '{"name":"test"}'.length,
    };
    const totalCharacters = Object.values(expectedCharCounts).reduce((a, b) => a + b, 0);

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    vi.mocked(fs.readFile).mockResolvedValue(malformedJson);

    await toolHandler({ path: testFilePath });

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    vi.mocked(fs.readFile).mockResolvedValue(markdownContentWithCRLF);

    await toolHandler({ path: testFilePath });

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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

    vi.mocked(fs.readFile).mockResolvedValue(plainContentWithCRLF);

    await toolHandler({ path: testFilePath });

    expect(formatPackToolResponse).toHaveBeenCalledWith(
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
