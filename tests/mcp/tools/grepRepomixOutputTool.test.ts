import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerGrepRepomixOutputTool } from '../../../src/mcp/tools/grepRepomixOutputTool.js';
import * as mcpToolRuntime from '../../../src/mcp/tools/mcpToolRuntime.js';

vi.mock('node:fs/promises');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js');
vi.mock('../../../src/shared/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    error: vi.fn(),
  },
}));

describe('grepRepomixOutputTool', () => {
  const mockMcpServer = {
    tool: vi.fn(),
  } as const;

  type ToolHandlerType = (args: {
    outputId: string;
    pattern: string;
    contextLines?: number;
    ignoreCase?: boolean;
  }) => Promise<{
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
  }>;

  let toolHandler: ToolHandlerType;

  beforeEach(() => {
    vi.resetAllMocks();

    registerGrepRepomixOutputTool(mockMcpServer as unknown as McpServer);

    toolHandler = mockMcpServer.tool.mock.calls[0][4];
  });

  it('should register the tool with correct parameters', () => {
    expect(mockMcpServer.tool).toHaveBeenCalledWith(
      'grep_repomix_output',
      expect.any(String),
      expect.objectContaining({
        outputId: expect.any(Object),
        pattern: expect.any(Object),
        contextLines: expect.any(Object),
        ignoreCase: expect.any(Object),
      }),
      expect.objectContaining({
        title: 'Grep Repomix Output',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      }),
      expect.any(Function),
    );
  });

  it('should find matches and return them with line numbers', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(
      'line 1\npattern match\nline 3\nanother pattern\nline 5' as unknown as Buffer,
    );

    const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern' });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toContain('Found 2 match(es)');
    expect(result.content[1].text).toContain('2:pattern match');
    expect(result.content[1].text).toContain('4:another pattern');
  });

  it('should handle context lines correctly', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('line 1\nline 2\npattern match\nline 4\nline 5' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern', contextLines: 1 });

    expect(result.content[1].text).toContain('2-line 2');
    expect(result.content[1].text).toContain('3:pattern match');
    expect(result.content[1].text).toContain('4-line 4');
  });

  it('should handle case insensitive search', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('Line 1\nPATTERN match\nline 3' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern', ignoreCase: true });

    expect(result.content[1].text).toContain('2:PATTERN match');
  });

  it('should return no matches message when pattern not found', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('line 1\nline 2\nline 3' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', pattern: 'notfound' });

    expect(result.content[0].text).toContain('No matches found');
  });

  it('should handle invalid regex patterns', async () => {
    vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('some content' as unknown as Buffer);

    const result = await toolHandler({ outputId: 'test-id', pattern: '[invalid' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid regular expression pattern');
  });
});
