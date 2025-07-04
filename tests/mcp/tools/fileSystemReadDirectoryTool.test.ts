import type { Dirent, Stats } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadDirectoryTool } from '../../../src/mcp/tools/fileSystemReadDirectoryTool.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('node:fs');
vi.mock('node:path');
vi.mock('../../../src/shared/logger.js');

describe('FileSystemReadDirectoryTool', () => {
  const mockServer = {
    tool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(() => {
    vi.resetAllMocks();
    registerFileSystemReadDirectoryTool(mockServer);
    toolHandler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][4];

    // デフォルトのpath.isAbsoluteの動作をモック
    vi.mocked(path.isAbsolute).mockImplementation((p: string) => p.startsWith('/'));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      'file_system_read_directory',
      'List the contents of a directory using an absolute path. Returns a formatted list showing files and subdirectories with clear [FILE]/[DIR] indicators. Useful for exploring project structure and understanding codebase organization.',
      expect.any(Object),
      expect.any(Object), // annotations
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
          text: `Error: Path must be absolute. Received: ${testPath}`,
        },
      ],
    });
  });

  test('should handle non-existent directory', async () => {
    const testPath = '/non/existent/dir';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: Directory not found at path: ${testPath}`,
        },
      ],
    });
  });
});
