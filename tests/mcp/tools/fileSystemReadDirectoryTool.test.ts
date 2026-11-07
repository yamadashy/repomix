import type fs from 'node:fs/promises';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadDirectoryTool } from '../../../src/mcp/tools/fileSystemReadDirectoryTool.js';
import { logger } from '../../../src/shared/logger.js';
import { type MockedDeps, mockOverloaded } from '../../testing/depsDoubles.js';
import { createMcpServerDouble, type McpServerDouble } from '../../testing/mcpServerDoubles.js';

type Deps = NonNullable<Parameters<typeof registerFileSystemReadDirectoryTool>[2]>;
type Stats = Awaited<ReturnType<Deps['stat']>>;
type Dirents = Awaited<ReturnType<Deps['readdir']>>;

describe('FileSystemReadDirectoryTool', () => {
  let mockServer: McpServerDouble;

  let toolHandler: (args: { path: string }) => Promise<CallToolResult>;
  let deps: MockedDeps<Deps>;

  beforeEach(() => {
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    deps = {
      stat: mockOverloaded<typeof fs.stat>(),
      readdir: mockOverloaded<typeof fs.readdir>(),
    };
    mockServer = createMcpServerDouble();
    registerFileSystemReadDirectoryTool(mockServer.server, undefined, deps);
    toolHandler = mockServer.toolHandler();
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
    // Realistic ENOENT (with .code) — a missing dir maps to "not found"; other stat
    // errors (e.g. EACCES) now bubble to the outer catch instead of being masked.
    deps.stat.mockRejectedValue(Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }));

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
    deps.stat.mockResolvedValue({ isDirectory: () => false } as Stats);

    const result = await toolHandler({ path: testPath });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text).errorMessage).toContain('not a directory');
  });

  test('should list directory contents with [FILE]/[DIR] prefixes', async () => {
    const testPath = '/some/dir';
    deps.stat.mockResolvedValue({ isDirectory: () => true } as Stats);
    deps.readdir.mockResolvedValue([
      { name: 'a.ts', isFile: () => true, isDirectory: () => false },
      { name: 'subdir', isFile: () => false, isDirectory: () => true },
      { name: 'b.md', isFile: () => true, isDirectory: () => false },
    ] as unknown as Dirents);

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
    deps.stat.mockResolvedValue({ isDirectory: () => true } as Stats);
    deps.readdir.mockResolvedValue([] as Dirents);

    const result = await toolHandler({ path: testPath });

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.contents).toEqual(['(empty directory)']);
    expect(parsed.totalItems).toBe(0);
  });

  test('should report readdir failures via the outer catch', async () => {
    const testPath = '/some/dir';
    deps.stat.mockResolvedValue({ isDirectory: () => true } as Stats);
    deps.readdir.mockRejectedValue(new Error('EACCES'));

    const result = await toolHandler({ path: testPath });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(JSON.parse(text).errorMessage).toContain('EACCES');
  });
});
