import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
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

  let toolHandler: (args: {
    path: string;
    topFilesLength?: number;
  }) => Promise<CallToolResult>;

  const mockXmlContent = `
    <repomix>
      <file path="src/index.js">console.log('Hello');</file>
      <file path="src/utils.js">function helper() {}</file>
      <file path="package.json">{"name":"test"}</file>
    </repomix>
  `;

  const defaultPackResult = {
    totalFiles: 3,
    totalCharacters: mockXmlContent.length,
    totalTokens: Math.floor(mockXmlContent.length / 4),
    fileCharCounts: {
      'src/index.js': 100,
      'src/utils.js': 100,
      'package.json': 100,
    },
    fileTokenCounts: {
      'src/index.js': 25,
      'src/utils.js': 25,
      'package.json': 25,
    },
    processedFiles: [
      { path: 'src/index.js', content: ''.padEnd(100) },
      { path: 'src/utils.js', content: ''.padEnd(100) },
      { path: 'package.json', content: ''.padEnd(100) },
    ],
    safeFilePaths: ['src/index.js', 'src/utils.js', 'package.json'],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    registerAttachPackedOutputTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    // Mock path functions
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.basename).mockImplementation((p) => p.split('/').pop() || '');
    vi.mocked(path.dirname).mockImplementation((p) => p.split('/').slice(0, -1).join('/') || '.');

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
    expect(formatPackToolResponse).toHaveBeenCalledWith(
      { directory: 'test' },
      expect.anything(),
      testFilePath,
      undefined,
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
    );
  });

  test('should handle non-XML file error', async () => {
    const testFilePath = '/test/not-xml-file.txt';
    
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
});
