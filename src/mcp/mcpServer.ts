import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getVersion } from '../core/file/packageJsonParse.js';
import { logger } from '../shared/logger.js';
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
const MCP_SERVER_INSTRUCTIONS_OUTRO = 'Includes security scanning and supports compression for token efficiency.';

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

export const createMcpServer = async (config: McpServerConfig = defaultMcpServerConfig()) => {
  const mcpServer = new McpServer(
    {
      name: 'repomix-mcp-server',
      version: await getVersion(),
    },
    {
      instructions: config.sandboxed ? SANDBOX_INSTRUCTIONS : MCP_SERVER_INSTRUCTIONS,
    },
  );

  // Always available (read-only, root-confinable) tools.
  registerPackCodebaseTool(mcpServer, config);
  registerReadRepomixOutputTool(mcpServer, config);
  registerGrepRepomixOutputTool(mcpServer, config);
  registerFileSystemReadFileTool(mcpServer, config);
  registerFileSystemReadDirectoryTool(mcpServer, config);

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

export const runMcpServer = async (options: RunMcpServerOptions = {}) => {
  const config: McpServerConfig = {
    sandboxed: options.sandboxed === true,
    root: options.root ?? process.cwd(),
  };
  const server = await createMcpServer(config);
  const transport = new StdioServerTransport();
  const processExit = options.processExit ?? process.exit;

  const handleExit = async () => {
    try {
      await server.close();
      logger.trace('Repomix MCP Server shutdown complete');
      processExit(0);
    } catch (error) {
      logger.error('Error during MCP server shutdown:', error);
      processExit(1);
    }
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  try {
    await server.connect(transport);
    logger.trace('Repomix MCP Server running on stdio');
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    processExit(1);
  }
};
