import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadDirectoryTool } from '../../../src/mcp/tools/fileSystemReadDirectoryTool.js';

vi.mock('node:fs/promises');
vi.mock('node:path');

describe('FileSystemReadDirectoryTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(() => {
    vi.resetAllMocks();
    registerFileSystemReadDirectoryTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    // Default mock for path.isAbsolute
    vi.mocked(path.isAbsolute).mockImplementation((p: string) => p.startsWith('/'));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'file_system_read_directory',
      expect.any(Object), // tool spec
      expect.any(Function),
    );
  });

  test('should handle relative path error', async () => {
    const testPath = 'relative/path';
    vi.mocked(path.isAbsolute).mockReturnValue(false);

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ errorMessage: `Error: Path must be absolute. Received: ${testPath}` }, null, 2),
        },
      ],
    });
  });

  test('should handle non-existent directory', async () => {
    const testPath = '/non/existent/dir';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ errorMessage: `Error: Directory not found at path: ${testPath}` }, null, 2),
        },
      ],
    });
  });

  test('should error when path points to a file', async () => {
    const testPath = '/some/file.txt';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as Awaited<ReturnType<typeof fs.stat>>);

    const result = await toolHandler({ path: testPath });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text).errorMessage).toContain('not a directory');
  });

  test('should list directory contents with [FILE]/[DIR] prefixes', async () => {
    const testPath = '/some/dir';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'a.ts', isFile: () => true, isDirectory: () => false },
      { name: 'subdir', isFile: () => false, isDirectory: () => true },
      { name: 'b.md', isFile: () => true, isDirectory: () => false },
    ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    const result = await toolHandler({ path: testPath });

    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.contents).toEqual(['[FILE] a.ts', '[DIR] subdir', '[FILE] b.md']);
    expect(parsed.fileCount).toBe(2);
    expect(parsed.directoryCount).toBe(1);
    expect(parsed.totalItems).toBe(3);
  });

  test('should report empty directory placeholder', async () => {
    const testPath = '/empty/dir';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

    const result = await toolHandler({ path: testPath });

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.contents).toEqual(['(empty directory)']);
    expect(parsed.totalItems).toBe(0);
  });

  test('should report readdir failures via the outer catch', async () => {
    const testPath = '/some/dir';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readdir).mockRejectedValue(new Error('EACCES'));

    const result = await toolHandler({ path: testPath });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text).errorMessage).toContain('EACCES');
  });
});
