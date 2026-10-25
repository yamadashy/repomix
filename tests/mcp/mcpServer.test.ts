import { McpServer } from '@modelcontextprotocol/server';
import type { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createMcpServer, runMcpServer } from '../../src/mcp/mcpServer.js';
import { logger } from '../../src/shared/logger.js';

// Use vi.hoisted for class mocks that need to work as constructors
const { MockMcpServer } = vi.hoisted(() => {
  const MockMcpServer = vi.fn().mockImplementation(function (this: unknown) {
    Object.assign(this as object, {
      registerTool: vi.fn().mockReturnThis(),
      registerPrompt: vi.fn().mockReturnThis(),
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    });
    return this;
  });
  return { MockMcpServer };
});

vi.mock('@modelcontextprotocol/server', () => ({
  McpServer: MockMcpServer,
}));
vi.mock('../../src/shared/logger.js');

type ServeStdioArgs = Parameters<typeof import('@modelcontextprotocol/server/stdio').serveStdio>;

// Minimal stand-in for StdioServerTransport: serveStdio (mocked below) installs onclose on
// it, exactly like the real entry does, so tests can simulate stdin EOF via `close()`.
const createFakeTransport = () => {
  const transport = {
    onclose: undefined as (() => void) | undefined,
    close: vi.fn(async () => {
      transport.onclose?.();
    }),
  };
  return transport;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MCP Server', () => {
  const mockVersion = '1.0.0';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMcpServer', () => {
    test('should create server with correct configuration', () => {
      const server = createMcpServer(mockVersion);

      expect(McpServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'repomix-mcp-server',
          title: 'Repomix',
          version: mockVersion,
          websiteUrl: 'https://repomix.com',
        }),
        expect.objectContaining({
          instructions: expect.stringContaining('Repomix MCP Server provides AI-optimized codebase analysis tools'),
        }),
      );
      expect(server).toBeDefined();
    });

    test('embeds icons as data URIs with a PNG fallback', () => {
      createMcpServer(mockVersion);
      const icons = vi.mocked(McpServer).mock.calls[0][0].icons ?? [];
      expect(icons.map(({ mimeType, sizes }) => ({ mimeType, sizes }))).toEqual([
        { mimeType: 'image/svg+xml', sizes: ['any'] },
        { mimeType: 'image/png', sizes: ['48x48'] },
      ]);
      for (const icon of icons) {
        expect(icon.src.startsWith(`data:${icon.mimeType};base64,`)).toBe(true);
      }
      const png = Buffer.from(icons[1].src.split(',')[1], 'base64');
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([48, 48]);
      expect(Buffer.from(icons[0].src.split(',')[1], 'base64').toString()).toContain('<svg');
    });

    test('bounds tool input size and sets list cache hints', () => {
      createMcpServer(mockVersion);
      const options = vi.mocked(McpServer).mock.calls[0][1];
      expect(options?.maxToolInputElements).toBe(10_000);
      expect(options?.cacheHints).toEqual({
        'tools/list': { ttlMs: 60 * 60 * 1000 },
        'prompts/list': { ttlMs: 60 * 60 * 1000 },
      });
    });

    test('registers the 6 packing/analysis tools by default (non-sandboxed)', () => {
      const server = createMcpServer(mockVersion);
      const registerTool = (server as unknown as { registerTool: ReturnType<typeof vi.fn> }).registerTool;
      const names = registerTool.mock.calls.map((c) => c[0]);
      expect(names).toEqual(
        expect.arrayContaining([
          'pack_codebase',
          'pack_remote_repository',
          'generate_skill',
          'attach_packed_output',
          'read_repomix_output',
          'grep_repomix_output',
        ]),
      );
      // The raw file tools are sandbox-only: outside --sandbox nothing bounds the
      // paths they accept, so they are not offered at all.
      expect(names).not.toContain('file_system_read_file');
      expect(names).not.toContain('file_system_read_directory');
      expect(names).toHaveLength(6);
      const registerPrompt = (server as unknown as { registerPrompt: ReturnType<typeof vi.fn> }).registerPrompt;
      expect(registerPrompt.mock.calls.map((c) => c[0])).toEqual(['pack_remote_repository']);
    });

    test('registers only the 5 read-only tools and no prompts when sandboxed', () => {
      const server = createMcpServer(mockVersion, { sandboxed: true, root: '/allowed/dir' });
      const registerTool = (server as unknown as { registerTool: ReturnType<typeof vi.fn> }).registerTool;
      const names = registerTool.mock.calls.map((c) => c[0]);
      expect(names.sort()).toEqual(
        [
          'file_system_read_directory',
          'file_system_read_file',
          'grep_repomix_output',
          'pack_codebase',
          'read_repomix_output',
        ].sort(),
      );
      const registerPrompt = (server as unknown as { registerPrompt: ReturnType<typeof vi.fn> }).registerPrompt;
      expect(registerPrompt).not.toHaveBeenCalled();
    });

    test('sandboxed instructions tell the agent paths are relative to the workspace root', () => {
      createMcpServer(mockVersion, { sandboxed: true, root: '/allowed/dir' });
      expect(McpServer).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          instructions: expect.stringContaining('relative to workspace root'),
        }),
      );
    });
  });

  describe('runMcpServer', () => {
    let mockExit: ReturnType<typeof vi.fn<(code?: number) => never>>;
    let transport: ReturnType<typeof createFakeTransport>;
    let handle: { close: ReturnType<typeof vi.fn<() => Promise<void>>> };
    let serveStdio: ReturnType<typeof vi.fn<(...args: ServeStdioArgs) => { close: () => Promise<void> }>>;
    let deps: NonNullable<Parameters<typeof runMcpServer>[1]>;
    let existingListeners: Record<'SIGINT' | 'SIGTERM', NodeJS.SignalsListener[]>;

    beforeEach(() => {
      existingListeners = {
        SIGINT: process.listeners('SIGINT') as NodeJS.SignalsListener[],
        SIGTERM: process.listeners('SIGTERM') as NodeJS.SignalsListener[],
      };
      mockExit = vi.fn();
      transport = createFakeTransport();
      handle = { close: vi.fn(async () => {}) };
      serveStdio = vi.fn((_factory, options) => {
        // Mirror the real entry: it takes ownership of the transport's onclose.
        if (options?.transport) options.transport.onclose = vi.fn();
        return handle;
      });
      deps = {
        getVersion: vi.fn().mockResolvedValue(mockVersion),
        serveStdio,
        createStdioTransport: () => transport as unknown as StdioServerTransport,
        shutdownTimeoutMs: 5_000,
      };
    });

    // Drop only the handlers runMcpServer added so they do not leak into later tests.
    afterEach(() => {
      for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        for (const listener of process.listeners(signal) as NodeJS.SignalsListener[]) {
          if (!existingListeners[signal].includes(listener)) process.off(signal, listener);
        }
      }
    });

    test('serves stdio through serveStdio with our transport', async () => {
      await expect(runMcpServer({ processExit: mockExit }, deps)).resolves.toBeUndefined();

      expect(serveStdio).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ transport }));
      expect(logger.trace).toHaveBeenCalledWith('Repomix MCP Server running on stdio');
    });

    test('factory synchronously builds a fresh server each call with the precomputed version', async () => {
      await runMcpServer({ processExit: mockExit, sandboxed: true, root: '/allowed/dir' }, deps);
      const factory = serveStdio.mock.calls[0][0];

      const first = factory({} as never);
      const second = factory({} as never);
      expect(first).not.toBeInstanceOf(Promise);
      expect(first).not.toBe(second);
      expect(deps?.getVersion).toHaveBeenCalledTimes(1);
      expect(McpServer).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'repomix-mcp-server', version: mockVersion }),
        expect.objectContaining({ instructions: expect.stringContaining('SANDBOX MODE') }),
      );
    });

    test('should handle startup error', async () => {
      const error = new Error('Version lookup failed');
      vi.mocked(deps?.getVersion as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await runMcpServer({ processExit: mockExit }, deps);

      expect(serveStdio).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Failed to start MCP server:', error);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test.each(['SIGINT', 'SIGTERM'] as const)('should shut down on %s', async (signal) => {
      await runMcpServer({ processExit: mockExit }, deps);
      process.emit(signal);
      await flush();

      expect(handle.close).toHaveBeenCalled();
      expect(logger.trace).toHaveBeenCalledWith('Repomix MCP Server shutdown complete');
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('should shut down when the client closes stdin, after the SDK teardown', async () => {
      await runMcpServer({ processExit: mockExit }, deps);
      await transport.close();
      await flush();

      expect(handle.close).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('runs the SDK onclose before shutting down and only shuts down once', async () => {
      const order: string[] = [];
      serveStdio.mockImplementation((_factory, options) => {
        if (options?.transport) {
          options.transport.onclose = () => {
            order.push('sdk');
          };
        }
        return handle;
      });
      handle.close.mockImplementation(async () => {
        order.push('handle.close');
      });

      await runMcpServer({ processExit: mockExit }, deps);
      await transport.close();
      process.emit('SIGINT');
      await flush();

      expect(order).toEqual(['sdk', 'handle.close']);
      expect(mockExit).toHaveBeenCalledTimes(1);
    });

    test('exits anyway when shutdown hangs past the timeout (e.g. stdout never drains)', async () => {
      vi.useFakeTimers();
      try {
        handle.close.mockImplementation(() => new Promise<void>(() => {}));

        await runMcpServer({ processExit: mockExit }, { ...deps, shutdownTimeoutMs: 100 });
        process.emit('SIGTERM');
        await vi.advanceTimersByTimeAsync(99);
        expect(mockExit).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(logger.trace).toHaveBeenCalledWith('MCP server shutdown timed out, exiting');
        expect(mockExit).toHaveBeenCalledWith(0);
      } finally {
        vi.useRealTimers();
      }
    });

    test('should handle shutdown error', async () => {
      const error = new Error('Shutdown failed');
      handle.close.mockRejectedValue(error);

      await runMcpServer({ processExit: mockExit }, deps);
      process.emit('SIGINT');
      await flush();

      expect(logger.error).toHaveBeenCalledWith('Error during MCP server shutdown:', error);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
