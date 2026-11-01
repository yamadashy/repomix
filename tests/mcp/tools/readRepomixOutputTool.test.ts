import type { McpServer } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerReadRepomixOutputTool } from '../../../src/mcp/tools/readRepomixOutputTool.js';
import { logger } from '../../../src/shared/logger.js';

describe('readRepomixOutputTool', () => {
  const mockMcpServer = {
    registerTool: vi.fn(),
  } as const;

  type ToolHandlerType = (args: { outputId: string; startLine?: number; endLine?: number }) => Promise<{
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  }>;

  let toolHandler: ToolHandlerType;
  let deps: NonNullable<Parameters<typeof registerReadRepomixOutputTool>[2]>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    deps = {
      access: vi.fn(),
      readFile: vi.fn(),
      getOutputFilePath: vi.fn(),
      requiresSecretScan: vi.fn(),
      createSecretLintConfig: vi.fn().mockReturnValue({}),
      runSecretLint: vi.fn().mockResolvedValue(null),
    };

    registerReadRepomixOutputTool(mockMcpServer as unknown as McpServer, undefined, deps);

    toolHandler = mockMcpServer.registerTool.mock.calls[0][2];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register the tool with correct parameters', () => {
    expect(mockMcpServer.registerTool).toHaveBeenCalledWith(
      'read_repomix_output',
      expect.any(Object), // tool spec
      expect.any(Function),
    );
  });

  it('should return an error if output file ID is not found', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue(undefined);

    const result = await toolHandler({ outputId: 'non-existent-id' });

    expect(deps.getOutputFilePath).toHaveBeenCalledWith('non-existent-id');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Output file with ID non-existent-id not found');
  });

  it('should return an error if the file does not exist', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockRejectedValue(new Error('File not found'));

    const result = await toolHandler({ outputId: 'test-id' });

    expect(deps.getOutputFilePath).toHaveBeenCalledWith('test-id');
    expect(deps.access).toHaveBeenCalledWith('/path/to/file.xml');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Output file does not exist at path: /path/to/file.xml');
  });

  it('should successfully read the file content', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('File content here');

    const result = await toolHandler({ outputId: 'test-id' });

    expect(deps.getOutputFilePath).toHaveBeenCalledWith('test-id');
    expect(deps.access).toHaveBeenCalledWith('/path/to/file.xml');
    expect(deps.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should block attach-sourced content that fails the secret scan', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/attached.json');
    vi.mocked(deps.requiresSecretScan).mockReturnValue(true);
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('api_key = "leaked-secret"');
    // Secret scan flags the content.
    vi.mocked(deps.runSecretLint).mockResolvedValue({ filePath: '/path/to/attached.json', messages: [] } as never);

    const result = await toolHandler({ outputId: 'attached-id' });

    expect(deps.runSecretLint).toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Security check failed');
  });

  it('should not secret-scan outputs that are not attach-sourced', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/packed.xml');
    vi.mocked(deps.requiresSecretScan).mockReturnValue(false);
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('File content here');

    const result = await toolHandler({ outputId: 'packed-id' });

    expect(deps.runSecretLint).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
  });

  it('should handle unexpected errors during execution', async () => {
    vi.mocked(deps.getOutputFilePath).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await toolHandler({ outputId: 'test-id' });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Unexpected error');
  });

  it('should read specific line range when startLine and endLine are provided', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', startLine: 2, endLine: 4 });

    expect(deps.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should read from startLine to end when only startLine is provided', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', startLine: 3 });

    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should read from beginning to endLine when only endLine is provided', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', endLine: 2 });

    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should return an error if startLine exceeds total lines', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3');

    const result = await toolHandler({ outputId: 'test-id', startLine: 10 });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Start line 10 exceeds total lines (3)');
  });

  it('should return an error if startLine is greater than endLine', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    const result = await toolHandler({ outputId: 'test-id', startLine: 4, endLine: 2 });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Start line (4) cannot be greater than end line (2)');
  });

  it('should handle string parameters by coercing them to numbers', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    // Simulate Cursor AI sending strings instead of numbers
    const result = await toolHandler({
      outputId: 'test-id',
      startLine: '2' as unknown as number,
      endLine: '4' as unknown as number,
    });

    expect(deps.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    // The structured content is handled internally by the MCP framework
  });

  it('should handle mixed string and number parameters', async () => {
    vi.mocked(deps.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(deps.access).mockResolvedValue(undefined);
    vi.mocked(deps.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');

    // Test with startLine as string and endLine as number
    const result = await toolHandler({
      outputId: 'test-id',
      startLine: '2' as unknown as number,
      endLine: 4,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
  });
});
