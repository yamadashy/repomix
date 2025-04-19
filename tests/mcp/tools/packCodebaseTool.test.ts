import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../../src/cli/cliRun.js';
import { createToolWorkspace, formatToolError, formatToolResponse } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerPackCodebaseTool } from '../../../src/mcp/tools/packCodebaseTool.js';

vi.mock('node:path');
vi.mock('../../../src/cli/cliRun.js');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js');

describe('PackCodebaseTool', () => {
  const mockServer = {
    tool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: {
    directory: string;
    compress?: boolean;
    includePatterns?: string;
    ignorePatterns?: string;
    topFilesLength?: number;
  }) => Promise<CallToolResult>;

  const defaultPackResult = {
    totalFiles: 10,
    totalCharacters: 1000,
    totalTokens: 500,
    fileCharCounts: { 'test.js': 100 },
    fileTokenCounts: { 'test.js': 50 },
    suspiciousFilesResults: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    registerPackCodebaseTool(mockServer);
    toolHandler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    // デフォルトのパスの動作をモック
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    // mcpToolRuntimeのデフォルトの動作をモック
    vi.mocked(createToolWorkspace).mockResolvedValue('/temp/dir');
    vi.mocked(formatToolResponse).mockReturnValue({
      content: [{ type: 'text', text: 'Success response' }],
    });
    vi.mocked(formatToolError).mockReturnValue({
      isError: true,
      content: [{ type: 'text', text: 'Error response' }],
    });

    // runCliのデフォルト動作
    vi.mocked(runCli).mockImplementation(async (directories, cwd, opts = {}) => ({
      packResult: defaultPackResult,
      config: {
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: opts.output ?? '/temp/dir/repomix-output.xml',
          style: opts.style ?? 'xml',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          removeComments: false,
          removeEmptyLines: false,
          compress: opts.compress ?? true,
          topFilesLength: opts.topFilesLen ?? 5,
          showLineNumbers: false,
          copyToClipboard: false,
          files: true,
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
          },
          includeEmptyDirectories: false,
        },
        cwd,
        include: Array.isArray(opts.include) ? opts.include : opts.include ? [opts.include] : [],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: opts.ignore ? [opts.ignore] : [],
        },
        security: {
          enableSecurityCheck: opts.securityCheck ?? true,
        },
        tokenCount: {
          encoding: 'o200k_base' as const,
        },
      },
    }));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      'pack_codebase',
      'Package local code directory into a consolidated file for AI analysis',
      expect.any(Object),
      expect.any(Function),
    );
  });

  test('should handle custom options', async () => {
    const testDir = '/test/project';
    const options = {
      directory: testDir,
      compress: false,
      includePatterns: '**/*.js',
      ignorePatterns: 'test/**',
      topFilesLength: 10,
    };

    await toolHandler(options);

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      testDir,
      expect.objectContaining({
        compress: false,
        include: '**/*.js',
        ignore: 'test/**',
        topFilesLen: 10,
      }),
    );
  });

  test('should handle CLI execution failure', async () => {
    const testDir = '/test/project';
    vi.mocked(runCli).mockResolvedValue(undefined);

    const result = await toolHandler({ directory: testDir });

    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: 'Failed to return a result',
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  test('should handle general error', async () => {
    const testDir = '/test/project';
    const error = new Error('Pack failed');
    vi.mocked(runCli).mockRejectedValue(error);

    const result = await toolHandler({ directory: testDir });

    expect(formatToolError).toHaveBeenCalledWith(error);
    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Error response' }],
    });
  });

  test('should handle workspace creation error', async () => {
    const testDir = '/test/project';
    const error = new Error('Workspace creation failed');
    vi.mocked(createToolWorkspace).mockRejectedValue(error);

    const result = await toolHandler({ directory: testDir });

    expect(formatToolError).toHaveBeenCalledWith(error);
    expect(result).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Error response' }],
    });
  });
});
