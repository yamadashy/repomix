import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport, serveStdio } from '@modelcontextprotocol/server/stdio';
import { getVersion } from '../core/file/packageJsonParse.js';
import { logger } from '../shared/logger.js';
import { MCP_SERVER_ICONS } from './mcpServerIcons.js';
import { registerPackRemoteRepositoryPrompt } from './prompts/packRemoteRepositoryPrompts.js';
import { registerAttachPackedOutputTool } from './tools/attachPackedOutputTool.js';
import { registerFileSystemReadDirectoryTool } from './tools/fileSystemReadDirectoryTool.js';
import { registerFileSystemReadFileTool } from './tools/fileSystemReadFileTool.js';
import { registerGenerateSkillTool } from './tools/generateSkillTool.js';
import { registerGrepRepomixOutputTool } from './tools/grepRepomixOutputTool.js';
import { registerPackCodebaseTool } from './tools/packCodebaseTool.js';
import { registerPackRemoteRepositoryTool } from './tools/packRemoteRepositoryTool.js';
import { registerReadRepomixOutputTool } from './tools/readRepomixOutputTool.js';

/**
 * Instructions for the Repomix MCP Server that describe its capabilities and usage
 */
const MCP_SERVER_INSTRUCTIONS_INTRO = 'Repomix MCP Server provides AI-optimized codebase analysis tools. ';
const MCP_SERVER_INSTRUCTIONS_OUTRO = 'Scans for known secret formats and supports compression for token efficiency.';

const MCP_SERVER_INSTRUCTIONS =
  MCP_SERVER_INSTRUCTIONS_INTRO +
  'Use pack_codebase or pack_remote_repository to consolidate code into a single XML file, ' +
  'use generate_skill to create Claude Agent Skills from codebases, ' +
  'use attach_packed_output to work with existing packed outputs, ' +
  'then read_repomix_output and grep_repomix_output to analyze it. ' +
  'Perfect for code reviews, documentation generation, bug investigation, GitHub repository analysis, and understanding large codebases. ' +
  MCP_SERVER_INSTRUCTIONS_OUTRO;

export interface McpServerConfig {
  /** When true (--sandbox), confine every tool to `root` and virtualize all paths. */
  sandboxed: boolean;
  /** The allowed directory (server cwd). All tool paths must resolve inside it. */
  root: string;
}

const defaultMcpServerConfig = (): McpServerConfig => ({ sandboxed: false, root: process.cwd() });

// Shares the intro/outro but names only the sandbox-available tools — the disabled
// ones (remote pack, skill gen, attach) leave no trace for the agent — plus path rules.
const SANDBOX_INSTRUCTIONS =
  MCP_SERVER_INSTRUCTIONS_INTRO +
  'Use pack_codebase to consolidate code into a single XML file, then read_repomix_output and ' +
  'grep_repomix_output to analyze it; file_system_read_file and file_system_read_directory explore the tree. ' +
  'Perfect for code reviews, documentation generation, bug investigation, and understanding large codebases. ' +
  MCP_SERVER_INSTRUCTIONS_OUTRO +
  ' SANDBOX MODE: locked to a single workspace = the root. Paths must be relative to workspace root ' +
  '(e.g. "src/index.ts"; "." = whole workspace) — no absolute / "/" / "~/" / "../" / drive / ".." segment ' +
  '(refused; retry relative). Results are relative too (root = "."), no host paths. Explore with ' +
  'file_system_read_directory "." or pack_codebase ".", then feed returned paths to ' +
  'read_repomix_output / grep_repomix_output / file_system_read_file.';

// Upper bound on array elements + object members in one tools/call `arguments` payload
// (the SDK counts recursively, before schema validation). Every tool input here is a flat
// object of at most ~8 scalar fields; the only nested input is pack_codebase's
// `outputPatterns` (4 elements per entry), so even a few hundred patterns stay below 2,000.
// 10,000 leaves ample headroom while still refusing pathological payloads that the 10 MB
// stdio buffer would otherwise let through to schema validation.
const MAX_TOOL_INPUT_ELEMENTS = 10_000;

// The tool and prompt sets are fixed for the lifetime of the process (they depend only on
// --sandbox), so 2026-07-28 clients may cache the lists. 2025-era responses never carry
// cache fields, so this does not change what legacy clients see.
const LIST_CACHE_TTL_MS = 60 * 60 * 1000;

// handle.close() waits for pending writes to stdout to drain. If the client stops reading
// stdout, that wait never ends, so shutdown gives up after this long and exits anyway.
const SHUTDOWN_TIMEOUT_MS = 5_000;

/**
 * Builds one MCP server instance. Must stay synchronous, cheap and side-effect free:
 * `serveStdio` may call the factory more than once per connection (a discarded
 * 2026-07-28 probe instance followed by a 2025-era fallback). Anything async, such as
 * reading the package version, is resolved by the caller beforehand. Shared state like
 * the output file registry lives at module scope, so it is kept across instances.
 */
export const createMcpServer = (version: string, config: McpServerConfig = defaultMcpServerConfig()) => {
  const mcpServer = new McpServer(
    {
      name: 'repomix-mcp-server',
      title: 'Repomix',
      version,
      websiteUrl: 'https://repomix.com',
      icons: MCP_SERVER_ICONS,
    },
    {
      instructions: config.sandboxed ? SANDBOX_INSTRUCTIONS : MCP_SERVER_INSTRUCTIONS,
      maxToolInputElements: MAX_TOOL_INPUT_ELEMENTS,
      cacheHints: {
        'tools/list': { ttlMs: LIST_CACHE_TTL_MS },
        'prompts/list': { ttlMs: LIST_CACHE_TTL_MS },
      },
    },
  );

  // Always available (read-only, root-confinable) tools.
  registerPackCodebaseTool(mcpServer, config);
  registerReadRepomixOutputTool(mcpServer, config);
  registerGrepRepomixOutputTool(mcpServer, config);

  // The raw file tools are sandbox-only. Outside sandbox mode they read any path
  // the process can, and the secret scan they run is a content heuristic, not an
  // access boundary — an honest boundary for them exists only under --sandbox.
  if (config.sandboxed) {
    registerFileSystemReadFileTool(mcpServer, config);
    registerFileSystemReadDirectoryTool(mcpServer, config);
  }

  // Tools unavailable in sandbox mode: remote fetch (needs network),
  // skill generation (writes), attach (arbitrary-path read of external files).
  if (!config.sandboxed) {
    registerPackRemoteRepositoryPrompt(mcpServer);
    registerPackRemoteRepositoryTool(mcpServer);
    registerGenerateSkillTool(mcpServer);
    registerAttachPackedOutputTool(mcpServer);
  }

  return mcpServer;
};

type RunMcpServerOptions = {
  sandboxed?: boolean;
  root?: string;
  processExit?: (code?: number) => never;
};

export const runMcpServer = async (
  options: RunMcpServerOptions = {},
  deps = {
    getVersion,
    serveStdio,
    createStdioTransport: () => new StdioServerTransport(),
    shutdownTimeoutMs: SHUTDOWN_TIMEOUT_MS,
  },
) => {
  const config: McpServerConfig = {
    sandboxed: options.sandboxed === true,
    root: options.root ?? process.cwd(),
  };
  const processExit = options.processExit ?? process.exit;

  try {
    const version = await deps.getVersion();
    // Own the wire transport so we can observe it closing (stdin EOF = client gone).
    const transport = deps.createStdioTransport();

    // serveStdio picks the protocol era from the opening message: 2026-07-28 clients get
    // the new revision, `initialize`-based (2025-era) clients are served as before.
    const handle = deps.serveStdio(() => createMcpServer(version, config), {
      transport,
      onerror: (error) => logger.trace('MCP stdio transport error:', error),
    });

    let shuttingDown = false;
    const handleExit = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      let timer: NodeJS.Timeout | undefined;
      const timedOut = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), deps.shutdownTimeoutMs);
        timer.unref();
      });
      try {
        const result = await Promise.race([handle.close().then(() => 'closed' as const), timedOut]);
        logger.trace(
          result === 'closed' ? 'Repomix MCP Server shutdown complete' : 'MCP server shutdown timed out, exiting',
        );
        processExit(0);
      } catch (error) {
        logger.error('Error during MCP server shutdown:', error);
        processExit(1);
      } finally {
        clearTimeout(timer);
      }
    };

    // serveStdio installs its own onclose on the transport synchronously; chain onto it so
    // the SDK tears the connection down first, then we run the same shutdown as on a signal.
    // Exiting explicitly keeps lingering handles (e.g. worker pools) from holding the process.
    const sdkOnClose = transport.onclose;
    transport.onclose = () => {
      sdkOnClose?.();
      logger.trace('MCP client closed stdin, shutting down');
      void handleExit();
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    logger.trace('Repomix MCP Server running on stdio');
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    processExit(1);
  }
};
