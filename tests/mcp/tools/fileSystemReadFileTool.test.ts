import type { Stats } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runSecretLint } from '../../../src/core/security/workers/securityCheckWorker.js';
import { registerFileSystemReadFileTool } from '../../../src/mcp/tools/fileSystemReadFileTool.js';
import { logger } from '../../../src/shared/logger.js';

vi.mock('node:fs');
vi.mock('node:path');
vi.mock('../../../src/shared/logger.js');
vi.mock('../../../src/core/security/workers/securityCheckWorker.js');

describe('FileSystemReadFileTool', () => {
  const mockServer = {
    tool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(() => {
    vi.resetAllMocks();
    registerFileSystemReadFileTool(mockServer);
    toolHandler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][4];

    // デフォルトのpath.isAbsoluteの動作をモック
    vi.mocked(path.isAbsolute).mockImplementation((p: string) => p.startsWith('/'));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      'file_system_read_file',
      'Read a file from the local file system using an absolute path. Includes built-in security validation to detect and prevent access to files containing sensitive information (API keys, passwords, secrets).',
      expect.any(Object),
      expect.any(Object), // annotations
      expect.any(Function),
    );
  });

  test('should handle relative path error', async () => {
    const testPath = 'relative/path.txt';
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

  test('should handle non-existent file', async () => {
    const testPath = '/non/existent/file.txt';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error: File not found at path: ${testPath}`,
        },
      ],
    });
  });
});
