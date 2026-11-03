import type { CallToolResult } from '@modelcontextprotocol/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { runCliPreservingLogLevel } from '../../../src/mcp/tools/mcpToolRuntime.js';
import { registerPackCodebaseTool } from '../../../src/mcp/tools/packCodebaseTool.js';
import type { MockedDeps } from '../../testing/depsDoubles.js';
import { createMcpServerDouble, type McpServerDouble } from '../../testing/mcpServerDoubles.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('PackCodebaseTool', () => {
  let mockServer: McpServerDouble;

  let toolHandler: (
    args: {
      directory: string;
      compress?: boolean;
      includePatterns?: string;
      ignorePatterns?: string;
      outputPatterns?: { pattern: string; compress?: boolean; directoryStructureOnly?: boolean }[];
      topFilesLength?: number;
    },
    ctx?: unknown,
  ) => Promise<CallToolResult>;

  let deps: MockedDeps<NonNullable<Parameters<typeof registerPackCodebaseTool>[2]>>;
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
    vi.resetAllMocks();
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
    registerPackCodebaseTool(mockServer.server, undefined, deps);
    const handler = mockServer.toolHandler();
    // The SDK applies the schema default for `style` before invoking the handler.
    toolHandler = (args, ctx?) => handler({ style: 'xml', ...args }, ctx);

    runCli.mockImplementation(async (_directories, cwd, opts = {}) => ({
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
      undefined,
    );
  });

  test('forwards pipeline progress as notifications/progress when the client sent a progressToken', async () => {
    runCli.mockImplementationOnce(async (_dirs, _cwd, _opts, progressCallback) => {
      progressCallback?.('Searching for files...');
      return undefined as unknown as Awaited<ReturnType<typeof runCliPreservingLogLevel>>;
    });
    const notify = vi.fn().mockResolvedValue(undefined);

    await toolHandler({ directory: '/test/project' }, { mcpReq: { _meta: { progressToken: 'p1' }, notify } });

    expect(notify).toHaveBeenCalledWith({
      method: 'notifications/progress',
      params: { progressToken: 'p1', progress: 1, message: 'Searching for files...' },
    });
  });

  test('passes the request abort signal to runCli', async () => {
    const { signal } = new AbortController();

    await toolHandler({ directory: '/test/project' }, { mcpReq: { _meta: {}, notify: vi.fn(), signal } });

    expect(runCli).toHaveBeenCalledWith(['.'], '/test/project', expect.objectContaining({ signal }), undefined);
    expect(deps.removeToolWorkspace).not.toHaveBeenCalled();
  });

  test('removes the tool workspace when the request is cancelled', async () => {
    const controller = new AbortController();
    runCli.mockImplementationOnce(async () => {
      controller.abort();
      throw controller.signal.reason;
    });

    await toolHandler(
      { directory: '/test/project' },
      { mcpReq: { _meta: {}, notify: vi.fn(), signal: controller.signal } },
    );

    expect(deps.removeToolWorkspace).toHaveBeenCalledWith('/temp/dir');
  });

  test('passes no progress callback when the client sent no progressToken', async () => {
    const notify = vi.fn();
    await toolHandler({ directory: '/test/project' }, { mcpReq: { _meta: {}, notify } });
    expect(runCli.mock.calls[0][3]).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  test('should pass outputPatterns through to runCli', async () => {
    const testDir = '/test/project';
    const outputPatterns = [
      { pattern: 'src/core/**' },
      { pattern: 'docs/**/*', compress: true },
      { pattern: 'website/**/*', directoryStructureOnly: true },
    ];

    await toolHandler({ directory: testDir, compress: true, outputPatterns });

    expect(runCli).toHaveBeenCalledWith(
      ['.'],
      testDir,
      expect.objectContaining({
        compress: true,
        outputPatterns,
      }),
      undefined,
    );
  });

  test('should handle CLI execution failure', async () => {
    const testDir = '/test/project';
    runCli.mockResolvedValue(undefined);

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
    runCli.mockRejectedValue(error);

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
    deps.createToolWorkspace.mockRejectedValue(error);

    const result = await toolHandler({ directory: testDir });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const content = result.content[0];
    expect(content.type).toBe('text');
    const parsedResult = JSON.parse((content as { type: 'text'; text: string }).text);
    expect(parsedResult.errorMessage).toBe('Workspace creation failed');
  });

  test('rejects a directory outside the allowed root when sandboxed', async () => {
    const server = createMcpServerDouble();
    registerPackCodebaseTool(server.server, { sandboxed: true, root: '/allowed/dir' }, deps);
    const handler = server.toolHandler();

    const result = await handler({ directory: '../../etc', compress: false, topFilesLength: 10, style: 'xml' });

    expect(result.isError).toBe(true);
    expect((result.content[0] as { type: 'text'; text: string }).text).toContain('relative to workspace root');
  });
});
