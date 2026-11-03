import type { McpServer } from '@modelcontextprotocol/server';
import type { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest';
import type { getVersion as getVersionImpl } from '../../src/core/file/packageJsonParse.js';
import { createMcpServer, type McpServerConfig, runMcpServer } from '../../src/mcp/mcpServer.js';
import { logger } from '../../src/shared/logger.js';
import { nodeTimers } from '../../src/shared/timers.js';
import { createManualClock } from '../testing/manualClock.js';
import { createMcpServerDouble, type McpServerDouble } from '../testing/mcpServerDoubles.js';

// Stands in for the SDK's McpServer class; it must work as a constructor. Each instance is a
// recorded double, so tests can assert on the tools and prompts registered on it.
let lastServer: McpServerDouble;
const MockMcpServer = vi.fn(function (this: unknown, ..._args: ConstructorParameters<typeof McpServer>) {
  lastServer = createMcpServerDouble();
  return lastServer.server;
});

const createServer = (version: string, config?: McpServerConfig) =>
  createMcpServer(version, config, { McpServer: MockMcpServer as unknown as typeof McpServer });

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
    vi.spyOn(logger, 'trace').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMcpServer', () => {
    test('should create server with correct configuration', () => {
      const server = createServer(mockVersion);

      expect(MockMcpServer).toHaveBeenCalledWith(
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
      createServer(mockVersion);
      const [serverInfo] = MockMcpServer.mock.calls[0];
      const icons = serverInfo.icons ?? [];
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
      createServer(mockVersion);
      const [, options] = MockMcpServer.mock.calls[0];
      expect(options?.maxToolInputElements).toBe(10_000);
      expect(options?.cacheHints).toEqual({
        'tools/list': { ttlMs: 60 * 60 * 1000 },
        'prompts/list': { ttlMs: 60 * 60 * 1000 },
      });
    });

    test('registers the 6 packing/analysis tools by default (non-sandboxed)', () => {
      createServer(mockVersion);
      const names = lastServer.registerTool.mock.calls.map((c) => c[0]);
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
      expect(lastServer.registerPrompt.mock.calls.map((c) => c[0])).toEqual(['pack_remote_repository']);
    });

    test('registers only the 5 read-only tools and no prompts when sandboxed', () => {
      createServer(mockVersion, { sandboxed: true, root: '/allowed/dir' });
      const names = lastServer.registerTool.mock.calls.map((c) => c[0]);
      expect(names.sort()).toEqual(
        [
          'file_system_read_directory',
          'file_system_read_file',
          'grep_repomix_output',
          'pack_codebase',
          'read_repomix_output',
        ].sort(),
      );
      expect(lastServer.registerPrompt).not.toHaveBeenCalled();
    });

    test('sandboxed instructions tell the agent paths are relative to the workspace root', () => {
      createServer(mockVersion, { sandboxed: true, root: '/allowed/dir' });
      expect(MockMcpServer).toHaveBeenCalledWith(
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
    let getVersion: Mock<typeof getVersionImpl>;
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
      getVersion = vi.fn<typeof getVersionImpl>().mockResolvedValue(mockVersion);
      deps = {
        getVersion,
        serveStdio,
        createMcpServer: createServer,
        createStdioTransport: () => transport as unknown as StdioServerTransport,
        shutdownTimeoutMs: 5_000,
        timers: nodeTimers,
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
      expect(getVersion).toHaveBeenCalledTimes(1);
      expect(MockMcpServer).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'repomix-mcp-server', version: mockVersion }),
        expect.objectContaining({ instructions: expect.stringContaining('SANDBOX MODE') }),
      );
    });

    test('should handle startup error', async () => {
      const error = new Error('Version lookup failed');
      getVersion.mockRejectedValue(error);

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
      const clock = createManualClock();
      handle.close.mockImplementation(() => new Promise<void>(() => {}));

      await runMcpServer({ processExit: mockExit }, { ...deps, shutdownTimeoutMs: 100, timers: clock.timers });
      process.emit('SIGTERM');
      await clock.advance(99);
      expect(mockExit).not.toHaveBeenCalled();

      await clock.advance(1);
      expect(logger.trace).toHaveBeenCalledWith('MCP server shutdown timed out, exiting');
      expect(mockExit).toHaveBeenCalledWith(0);
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
