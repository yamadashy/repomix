import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runCli } from '../../../src/cli/cliRun.js';
import { createToolWorkspace, formatPackToolResponse } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerPackRemoteRepositoryTool } from '../../../src/mcp/tools/packRemoteRepositoryTool.js';
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

describe('PackRemoteRepositoryTool', () => {
  const mockServer = {
    registerTool: vi.fn().mockReturnThis(),
  } as unknown as McpServer;

  let toolHandler: (args: {
    remote: string;
    compress?: boolean;
    includePatterns?: string;
    ignorePatterns?: string;
    topFilesLength?: number;
    style?: 'xml' | 'markdown' | 'json' | 'plain';
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
    registerPackRemoteRepositoryTool(mockServer);
    toolHandler = (mockServer.registerTool as ReturnType<typeof vi.fn>).mock.calls[0][2];

    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    vi.mocked(createToolWorkspace).mockResolvedValue('/temp/dir');
    vi.mocked(formatPackToolResponse).mockResolvedValue({
      content: [{ type: 'text', text: 'Success response' }],
    });

    vi.mocked(runCli).mockImplementation(async (_directories, cwd, opts = {}) => ({
      packResult: defaultPackResult,
      config: createMockConfig({
        output: {
          filePath: opts.output ?? '/temp/dir/repomix-output.xml',
          style: opts.style ?? 'xml',
        },
        cwd,
      }),
    }));
  });

  test('registers the tool with the expected name', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'pack_remote_repository',
      expect.any(Object),
      expect.any(Function),
    );
  });

  test('forwards user options to runCli with the correct shape', async () => {
    await toolHandler({
      remote: 'yamadashy/repomix',
      compress: false,
      includePatterns: '**/*.ts',
      ignorePatterns: 'tests/**',
      topFilesLength: 7,
      style: 'markdown',
    });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      process.cwd(),
      expect.objectContaining({
        remote: 'yamadashy/repomix',
        compress: false,
        include: '**/*.ts',
        ignore: 'tests/**',
        topFilesLen: 7,
        style: 'markdown',
        securityCheck: true,
        quiet: true,
      }),
    );
    // path is fully determined by mocked createToolWorkspace + mocked path.join
    // (see beforeEach: '/temp/dir' + '/' + defaultFilePathMap[style]).
    // Hard-coding instead of expect.any(String) catches arg-swap regressions.
    expect(formatPackToolResponse).toHaveBeenCalledWith(
      { repository: 'yamadashy/repomix' },
      defaultPackResult,
      '/temp/dir/repomix-output.md',
      7,
    );
  });

  test('returns an error response when runCli yields no result', async () => {
    vi.mocked(runCli).mockResolvedValue(undefined);

    const result = await toolHandler({ remote: 'user/repo' });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { type: 'text'; text: string };
    expect(JSON.parse(content.text).errorMessage).toBe('Failed to return a result');
  });

  test('returns an error response when runCli throws', async () => {
    vi.mocked(runCli).mockRejectedValue(new Error('Clone failed'));

    const result = await toolHandler({ remote: 'user/repo' });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { type: 'text'; text: string };
    expect(JSON.parse(content.text).errorMessage).toBe('Clone failed');
  });

  test('returns an error response when workspace creation fails', async () => {
    vi.mocked(createToolWorkspace).mockRejectedValue(new Error('mkdtemp failed'));

    const result = await toolHandler({ remote: 'user/repo' });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { type: 'text'; text: string };
    expect(JSON.parse(content.text).errorMessage).toBe('mkdtemp failed');
  });
});
