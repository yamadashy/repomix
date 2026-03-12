import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadFileTool } from '../../../src/mcp/tools/fileSystemReadFileTool.js';

vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
  },
}));
vi.mock('node:path');
vi.mock('../../../src/core/security/workers/securityCheckWorker.js', () => ({
  createSecretLintConfig: vi.fn().mockReturnValue({}),
  runSecretLint: vi.fn().mockResolvedValue(null),
}));

import { runSecretLint } from '../../../src/core/security/workers/securityCheckWorker.js';

describe('FileSystemReadFileTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: { path: string }) => Promise<CallToolResult>;

  beforeEach(() => {
    vi.resetAllMocks();
    registerFileSystemReadFileTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    // デフォルトのpath.isAbsoluteの動作をモック
    vi.mocked(path.isAbsolute).mockImplementation((p: string) => p.startsWith('/'));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'file_system_read_file',
      expect.any(Object), // tool spec
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
          text: JSON.stringify({ errorMessage: `Error: Path must be absolute. Received: ${testPath}` }, null, 2),
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
          text: JSON.stringify({ errorMessage: `Error: File not found at path: ${testPath}` }, null, 2),
        },
      ],
    });
  });

  test('should handle directory path error', async () => {
    const testPath = '/some/directory';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.stat).mockResolvedValueOnce({
      isDirectory: () => true,
    } as unknown as Awaited<ReturnType<typeof fs.stat>>);

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              errorMessage: `Error: The specified path is a directory, not a file: ${testPath}. Use file_system_read_directory for directories.`,
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  test('should successfully read file and return content', async () => {
    const testPath = '/test/file.txt';
    const fileContent = 'Line 1\nLine 2\nLine 3';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>)
      .mockResolvedValueOnce({
        size: 21,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readFile).mockResolvedValueOnce(fileContent);
    vi.mocked(runSecretLint).mockResolvedValueOnce(null);

    const result = await toolHandler({ path: testPath });

    const expectedContent = {
      path: testPath,
      content: fileContent,
      size: 21,
      encoding: 'utf8',
      lines: 3,
    };
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(expectedContent, null, 2),
        },
      ],
      structuredContent: expectedContent,
    });
  });

  test('should block file when security check fails', async () => {
    const testPath = '/test/secrets.txt';
    const fileContent = 'API_KEY=secret123';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>)
      .mockResolvedValueOnce({
        size: 17,
      } as unknown as Awaited<ReturnType<typeof fs.stat>>);
    vi.mocked(fs.readFile).mockResolvedValueOnce(fileContent);
    vi.mocked(runSecretLint).mockResolvedValueOnce({
      filePath: testPath,
      messages: ['Found potential secret'],
      type: 'file',
    });

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              errorMessage: `Error: Security check failed. The file at ${testPath} may contain sensitive information.`,
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  test('should handle general errors during file reading', async () => {
    const testPath = '/test/file.txt';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.stat).mockRejectedValueOnce(new Error('Disk I/O error'));

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ errorMessage: 'Error reading file: Disk I/O error' }, null, 2),
        },
      ],
    });
  });

  test('should handle non-Error objects in catch block', async () => {
    const testPath = '/test/file.txt';
    vi.mocked(path.isAbsolute).mockReturnValue(true);
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(fs.stat).mockRejectedValueOnce('string error');

    const result = await toolHandler({ path: testPath });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ errorMessage: 'Error reading file: string error' }, null, 2),
        },
      ],
    });
  });
});
