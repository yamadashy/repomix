import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../../src/cli/cliRun.js';
import { createToolWorkspace, formatPackToolResponse } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerPackCodebaseTool } from '../../../src/mcp/tools/packCodebaseTool.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('node:path');
vi.mock('../../../src/cli/cliRun.js');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js', async () => {
  const actual = await vi.importActual('../../../src/mcp/tools/mcpToolRuntime.js');
  return {
    ...actual,
    createToolWorkspace: vi.fn(),
    formatPackToolResponse: vi.fn(),
  };
});

describe('PackCodebaseTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
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
    gitDiffTokenCount: 0,
    gitLogTokenCount: 0,
    suspiciousGitDiffResults: [],
    suspiciousGitLogResults: [],
    processedFiles: [],
    safeFilePaths: [],
    skippedFiles: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    registerPackCodebaseTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    // デフォルトのパスの動作をモック
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    // mcpToolRuntimeのデフォルトの動作をモック
    vi.mocked(createToolWorkspace).mockResolvedValue('/temp/dir');
    vi.mocked(formatPackToolResponse).mockResolvedValue({
      content: [{ type: 'text', text: 'Success response' }],
    });

    // runCliのデフォルト動作
    vi.mocked(runCli).mockImplementation(async (_directories, cwd, opts = {}) => ({
      packResult: defaultPackResult,
      config: createMockConfig({
        input: {
          maxFileSize: 50 * 1024 * 1024,
        },
        output: {
          filePath: opts.output ?? '/temp/dir/repomix-output.xml',
          style: opts.style ?? 'xml',
          parsableStyle: false,
          stdout: false,
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
            includeDiffs: false,
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
      }),
    }));
  });

  test('should register tool with correct parameters', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'pack_codebase',
      expect.any(Object), // tool spec
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

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Failed to return a result');
  });

  test('should handle general error', async () => {
    const testDir = '/test/project';
    const error = new Error('Pack failed');
    vi.mocked(runCli).mockRejectedValue(error);

    const result = await toolHandler({ directory: testDir });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Pack failed');
  });

  test('should handle workspace creation error', async () => {
    const testDir = '/test/project';
    const error = new Error('Workspace creation failed');
    vi.mocked(createToolWorkspace).mockRejectedValue(error);

    const result = await toolHandler({ directory: testDir });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Workspace creation failed');
  });
});
