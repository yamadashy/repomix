import type fs from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerReadRepomixOutputTool } from '../../../src/mcp/tools/readRepomixOutputTool.js';
import { logger } from '../../../src/shared/logger.js';
import { type MockedDeps, mockOverloaded } from '../../testing/depsDoubles.js';
import { createMcpServerDouble, type McpServerDouble } from '../../testing/mcpServerDoubles.js';

describe('readRepomixOutputTool', () => {
  // Strings model clients that send numbers as strings; the input schema coerces them.
  type ToolHandlerType = (args: {
    outputId: string;
    startLine?: number | string;
    endLine?: number | string;
  }) => Promise<{
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  }>;

  let mockMcpServer: McpServerDouble;
  let toolHandler: ToolHandlerType;
  let deps: MockedDeps<NonNullable<Parameters<typeof registerReadRepomixOutputTool>[2]>>;

  beforeEach(() => {
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    deps = {
      access: vi.fn(),
      readFile: mockOverloaded<typeof fs.readFile>(),
      getOutputFilePath: vi.fn(),
      requiresSecretScan: vi.fn(),
      createSecretLintConfig: vi.fn().mockReturnValue({}),
      runSecretLint: vi.fn().mockResolvedValue(null),
    };

    mockMcpServer = createMcpServerDouble();
    registerReadRepomixOutputTool(mockMcpServer.server, undefined, deps);

    toolHandler = mockMcpServer.toolHandler<ToolHandlerType>();
  });

  it('should register the tool with correct parameters', () => {
    expect(mockMcpServer.registerTool).toHaveBeenCalledWith(
      'read_repomix_output',
      expect.any(Object), // tool spec
      expect.any(Function),
    );
  });

  it('should return an error if output file ID is not found', async () => {
    deps.getOutputFilePath.mockReturnValue(undefined);

    const result = await toolHandler({ outputId: 'non-existent-id' });

    expect(deps.getOutputFilePath).toHaveBeenCalledWith('non-existent-id');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Output file with ID non-existent-id not found');
  });

  it('should return an error if the file does not exist', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockRejectedValue(new Error('File not found'));

    const result = await toolHandler({ outputId: 'test-id' });

    expect(deps.getOutputFilePath).toHaveBeenCalledWith('test-id');
    expect(deps.access).toHaveBeenCalledWith('/path/to/file.xml');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Output file does not exist at path: /path/to/file.xml');
  });

  it('should successfully read the file content', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('File content here');

    const result = await toolHandler({ outputId: 'test-id' });

    expect(deps.getOutputFilePath).toHaveBeenCalledWith('test-id');
    expect(deps.access).toHaveBeenCalledWith('/path/to/file.xml');
    expect(deps.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should block attach-sourced content that fails the secret scan', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/attached.json');
    deps.requiresSecretScan.mockReturnValue(true);
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('api_key = "leaked-secret"');
    // Secret scan flags the content.
    deps.runSecretLint.mockResolvedValue({ filePath: '/path/to/attached.json', messages: [], type: 'file' });

    const result = await toolHandler({ outputId: 'attached-id' });

    expect(deps.runSecretLint).toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Security check failed');
  });

  it('should not secret-scan outputs that are not attach-sourced', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/packed.xml');
    deps.requiresSecretScan.mockReturnValue(false);
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('File content here');

    const result = await toolHandler({ outputId: 'packed-id' });

    expect(deps.runSecretLint).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
  });

  it('should handle unexpected errors during execution', async () => {
    deps.getOutputFilePath.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await toolHandler({ outputId: 'test-id' });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Unexpected error');
  });

  it('should read specific line range when startLine and endLine are provided', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', startLine: 2, endLine: 4 });

    expect(deps.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should read from startLine to end when only startLine is provided', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', startLine: 3 });

    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should read from beginning to endLine when only endLine is provided', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', endLine: 2 });

    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should return an error if startLine exceeds total lines', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');

    const result = await toolHandler({ outputId: 'test-id', startLine: 10 });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Start line 10 exceeds total lines (3)');
  });

  it('should return an error if startLine is greater than endLine', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', startLine: 4, endLine: 2 });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Start line (4) cannot be greater than end line (2)');
  });

  it('should handle string parameters by coercing them to numbers', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    // Simulate Cursor AI sending strings instead of numbers
    const result = await toolHandler({
      outputId: 'test-id',
      startLine: '2',
      endLine: '4',
    });

    expect(deps.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should handle mixed string and number parameters', async () => {
    deps.getOutputFilePath.mockReturnValue('/path/to/file.xml');
    deps.access.mockResolvedValue(undefined);
    deps.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    // Test with startLine as string and endLine as number
    const result = await toolHandler({
      outputId: 'test-id',
      startLine: '2',
      endLine: 4,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
  });
});
