import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { runCliPreservingLogLevel } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerPackRemoteRepositoryTool } from '../../../src/mcp/tools/packRemoteRepositoryTool.js';
import type { MockedDeps } from '../../testing/depsDoubles.js';
import { createMcpServerDouble, type McpServerDouble } from '../../testing/mcpServerDoubles.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('PackRemoteRepositoryTool', () => {
  let mockServer: McpServerDouble;

  let toolHandler: (
    args: {
      remote: string;
      compress?: boolean;
      includePatterns?: string;
      ignorePatterns?: string;
      outputPatterns?: { pattern: string; compress?: boolean; directoryStructureOnly?: boolean }[];
      topFilesLength?: number;
      style?: 'xml' | 'markdown' | 'json' | 'plain';
    },
    ctx?: unknown,
  ) => Promise<CallToolResult>;

  let deps: MockedDeps<NonNullable<Parameters<typeof registerPackRemoteRepositoryTool>[1]>>;
  let runCli: ReturnType<typeof vi.fn<typeof runCliPreservingLogLevel>>;

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
    runCli = vi.fn<typeof runCliPreservingLogLevel>();
    deps = {
      createToolWorkspace: vi.fn().mockResolvedValue('/temp/dir'),
      formatPackToolResponse: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Success response' }],
      }),
      removeToolWorkspace: vi.fn(),
      runCliPreservingLogLevel: runCli,
    };
    mockServer = createMcpServerDouble();
    registerPackRemoteRepositoryTool(mockServer.server, deps);
    const handler = mockServer.toolHandler();
    // The SDK applies the schema default for `style` before invoking the handler.
    toolHandler = (args, ctx) => handler({ style: 'xml', ...args }, ctx);

    runCli.mockImplementation(async (_directories, cwd, opts = {}) => ({
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
      undefined,
    );
    // path is fully determined by the createToolWorkspace double + path.join
    // (see beforeEach: '/temp/dir' joined with defaultFilePathMap[style]).
    // Hard-coding instead of expect.any(String) catches arg-swap regressions.
    expect(deps.formatPackToolResponse).toHaveBeenCalledWith(
      { repository: 'yamadashy/repomix' },
      defaultPackResult,
      path.join('/temp/dir', 'repomix-output.md'),
      7,
    );
  });

  test('forwards outputPatterns to runCli', async () => {
    const outputPatterns = [
      { pattern: 'src/core/**' },
      { pattern: 'docs/**/*', compress: true },
      { pattern: 'website/**/*', directoryStructureOnly: true },
    ];

    await toolHandler({ remote: 'yamadashy/repomix', compress: true, outputPatterns });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      process.cwd(),
      expect.objectContaining({
        remote: 'yamadashy/repomix',
        compress: true,
        outputPatterns,
      }),
      undefined,
    );
  });

  test('returns an error response when runCli yields no result', async () => {
    runCli.mockResolvedValue(undefined);

    const result = await toolHandler({ remote: 'user/repo' });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { type: 'text'; text: string };
    expect(JSON.parse(content.text).errorMessage).toBe('Failed to return a result');
  });

  test('returns an error response when runCli throws', async () => {
    runCli.mockRejectedValue(new Error('Clone failed'));

    const result = await toolHandler({ remote: 'user/repo' });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { type: 'text'; text: string };
    expect(JSON.parse(content.text).errorMessage).toBe('Clone failed');
  });

  test('passes the request abort signal to runCli and cleans up when cancelled', async () => {
    const controller = new AbortController();
    runCli.mockImplementationOnce(async () => {
      controller.abort();
      throw controller.signal.reason;
    });
    await toolHandler(
      { remote: 'yamadashy/repomix' },
      { mcpReq: { _meta: {}, notify: vi.fn(), signal: controller.signal } },
    );

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      process.cwd(),
      expect.objectContaining({ signal: controller.signal }),
      undefined,
    );
    expect(deps.removeToolWorkspace).toHaveBeenCalledWith('/temp/dir');
  });

  test('returns an error response when workspace creation fails', async () => {
    deps.createToolWorkspace.mockRejectedValue(new Error('mkdtemp failed'));

    const result = await toolHandler({ remote: 'user/repo' });

    expect(result.isError).toBe(true);
    const content = result.content[0] as { type: 'text'; text: string };
    expect(JSON.parse(content.text).errorMessage).toBe('mkdtemp failed');
  });
});
