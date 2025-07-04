import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as mcpToolRuntime from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerReadRepomixOutputTool } from '../../../src/mcp/tools/readRepomixOutputTool.js';

vi.mock('node:fs/promises');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js', async () => {
  const actual = await vi.importActual('../../../src/mcp/tools/mcpToolRuntime.js');
  return {
    ...actual,
    getOutputFilePath: vi.fn(),
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
    tool: vi.fn(),
  } as const;

  type ToolHandlerType = (args: { outputId: string; startLine?: number; endLine?: number }) => Promise<{
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  }>;

  let toolHandler: ToolHandlerType;

  beforeEach(() => {
    vi.resetAllMocks();

    registerReadRepomixOutputTool(mockMcpServer as unknown as McpServer);

    toolHandler = mockMcpServer.tool.mock.calls[0][4];
  });

  it('should register the tool with correct parameters', () => {
    expect(mockMcpServer.tool).toHaveBeenCalledWith(
      'read_repomix_output',
      expect.any(String),
      expect.objectContaining({
        outputId: expect.any(Object),
        startLine: expect.any(Object),
        endLine: expect.any(Object),
      }),
      expect.objectContaining({
        title: 'Read Repomix Output',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      }),
      expect.any(Function),
    );
  });

  it('should return an error if output file ID is not found', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue(undefined);

    const result = await toolHandler({ outputId: 'non-existent-id' });

    expect(mcpToolRuntime.getOutputFilePath).toHaveBeenCalledWith('non-existent-id');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Output file with ID non-existent-id not found');
  });

  it('should return an error if the file does not exist', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

    const result = await toolHandler({ outputId: 'test-id' });

    expect(mcpToolRuntime.getOutputFilePath).toHaveBeenCalledWith('test-id');
    expect(fs.access).toHaveBeenCalledWith('/path/to/file.xml');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Output file does not exist at path: /path/to/file.xml');
  });

  it('should successfully read the file content', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('File content here' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id' });

    expect(mcpToolRuntime.getOutputFilePath).toHaveBeenCalledWith('test-id');
    expect(fs.access).toHaveBeenCalledWith('/path/to/file.xml');
    expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toContain('Content of Repomix output file (ID: test-id)');
    expect(result.content[1].text).toBe('File content here');
  });

  it('should handle unexpected errors during execution', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await toolHandler({ outputId: 'test-id' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error reading Repomix output: Unexpected error');
  });

  it('should read specific line range when startLine and endLine are provided', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', startLine: 2, endLine: 4 });

    expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.xml', 'utf8');
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toContain('Content of Repomix output file (ID: test-id) (lines 2-4)');
    expect(result.content[1].text).toBe('Line 2\nLine 3\nLine 4');
  });

  it('should read from startLine to end when only startLine is provided', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', startLine: 3 });

    expect(result.content[0].text).toContain('Content of Repomix output file (ID: test-id) (lines 3-end)');
    expect(result.content[1].text).toBe('Line 3\nLine 4\nLine 5');
  });

  it('should read from beginning to endLine when only endLine is provided', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', endLine: 2 });

    expect(result.content[0].text).toContain('Content of Repomix output file (ID: test-id) (lines 1-2)');
    expect(result.content[1].text).toBe('Line 1\nLine 2');
  });

  it('should return an error if startLine exceeds total lines', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', startLine: 10 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Start line 10 exceeds total lines (3)');
  });

  it('should return an error if startLine is greater than endLine', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', startLine: 4, endLine: 2 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Start line (4) cannot be greater than end line (2)');
  });
});
