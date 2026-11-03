import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerFileSystemReadFileTool } from '../../../src/mcp/tools/fileSystemReadFileTool.js';
import { logger } from '../../../src/shared/logger.js';

type Stats = Awaited<ReturnType<NonNullable<Parameters<typeof registerFileSystemReadFileTool>[2]>['stat']>>;

describe('FileSystemReadFileTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: { path: string }) => Promise<CallToolResult>;
  let deps: NonNullable<Parameters<typeof registerFileSystemReadFileTool>[2]>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    deps = {
      access: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn(),
      createSecretLintConfig: vi.fn().mockReturnValue({}),
      runSecretLint: vi.fn().mockResolvedValue(null),
    };
    registerFileSystemReadFileTool(mockServer, undefined, deps);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    vi.mocked(deps.access).mockRejectedValue(new Error('ENOENT'));

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
    vi.mocked(deps.access).mockResolvedValueOnce(undefined);
    vi.mocked(deps.stat).mockResolvedValueOnce({
      isDirectory: () => true,
    } as unknown as Stats);

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
    vi.mocked(deps.access).mockResolvedValueOnce(undefined);
    vi.mocked(deps.stat).mockResolvedValueOnce({
      isDirectory: () => false,
      size: 21,
    } as unknown as Stats);
    vi.mocked(deps.readFile).mockResolvedValueOnce(fileContent);
    vi.mocked(deps.runSecretLint).mockResolvedValueOnce(null);

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
    vi.mocked(deps.access).mockResolvedValueOnce(undefined);
    vi.mocked(deps.stat).mockResolvedValueOnce({
      isDirectory: () => false,
      size: 17,
    } as unknown as Stats);
    vi.mocked(deps.readFile).mockResolvedValueOnce(fileContent);
    vi.mocked(deps.runSecretLint).mockResolvedValueOnce({
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
    vi.mocked(deps.access).mockResolvedValueOnce(undefined);
    vi.mocked(deps.stat).mockRejectedValueOnce(new Error('Disk I/O error'));

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
    vi.mocked(deps.access).mockResolvedValueOnce(undefined);
    vi.mocked(deps.stat).mockRejectedValueOnce('string error');

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
