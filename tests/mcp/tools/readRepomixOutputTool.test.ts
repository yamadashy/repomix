import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as mcpToolRuntime from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerReadRepomixOutputTool } from '../../../src/mcp/tools/readRepomixOutputTool.js';

vi.mock('../../../src/mcp/tools/mcpToolRuntime.js', async () => {
  const actual = await vi.importActual('../../../src/mcp/tools/mcpToolRuntime.js');
  return {
    ...actual,
    getOutputContent: vi.fn(),
  };
});
vi.mock('../../../src/shared/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    error: vi.fn(),
  },
}));

describe('readRepomixOutputTool', () => {
  const mockMcpServer = {
    registerTool: vi.fn(),
  } as const;

  type ToolHandlerType = (args: { outputId: string; startLine?: number; endLine?: number }) => Promise<{
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  }>;

  let toolHandler: ToolHandlerType;

  beforeEach(() => {
    vi.resetAllMocks();

    registerReadRepomixOutputTool(mockMcpServer as unknown as McpServer);

    toolHandler = mockMcpServer.registerTool.mock.calls[0][2];
  });

  it('should register the tool with correct parameters', () => {
    expect(mockMcpServer.registerTool).toHaveBeenCalledWith(
      'read_repomix_output',
      expect.any(Object), // tool spec
      expect.any(Function),
    );
  });

  it('should return an error if output file ID is not found', async () => {
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue(null);

    const result = await toolHandler({ outputId: 'non-existent-id' });

    expect(mcpToolRuntime.getOutputContent).toHaveBeenCalledWith('non-existent-id');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Output file with ID non-existent-id not found');
  });

  it('should return an error if the file does not exist', async () => {
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue(null);

    const result = await toolHandler({ outputId: 'test-id' });

    expect(mcpToolRuntime.getOutputContent).toHaveBeenCalledWith('test-id');
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Output file with ID test-id not found');
  });

  it('should successfully read the file content', async () => {
    const content = 'File content here';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 1 });

    const result = await toolHandler({ outputId: 'test-id' });

    expect(mcpToolRuntime.getOutputContent).toHaveBeenCalledWith('test-id');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
  });

  it('should handle unexpected errors during execution', async () => {
    vi.mocked(mcpToolRuntime.getOutputContent).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await toolHandler({ outputId: 'test-id' });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Unexpected error');
  });

  it('should read specific line range when startLine and endLine are provided', async () => {
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 5 });

    const result = await toolHandler({ outputId: 'test-id', startLine: 2, endLine: 4 });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
  });

  it('should read from startLine to end when only startLine is provided', async () => {
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 5 });

    const result = await toolHandler({ outputId: 'test-id', startLine: 3 });

    expect(result.content).toHaveLength(1);
  });

  it('should read from beginning to endLine when only endLine is provided', async () => {
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 5 });

    const result = await toolHandler({ outputId: 'test-id', endLine: 2 });

    expect(result.content).toHaveLength(1);
  });

  it('should return an error if startLine exceeds total lines', async () => {
    const content = 'Line 1\nLine 2\nLine 3';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 3 });

    const result = await toolHandler({ outputId: 'test-id', startLine: 10 });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Start line 10 exceeds total lines (3)');
  });

  it('should return an error if startLine is greater than endLine', async () => {
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 5 });

    const result = await toolHandler({ outputId: 'test-id', startLine: 4, endLine: 2 });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.errorMessage).toContain('Error: Start line (4) cannot be greater than end line (2)');
  });

  it('should handle string parameters by coercing them to numbers', async () => {
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 5 });

    // Simulate Cursor AI sending strings instead of numbers
    const result = await toolHandler({
      outputId: 'test-id',
      startLine: '2' as unknown as number,
      endLine: '4' as unknown as number,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
  });

  it('should handle mixed string and number parameters', async () => {
    const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    vi.mocked(mcpToolRuntime.getOutputContent).mockResolvedValue({ content, totalLines: 5 });

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
