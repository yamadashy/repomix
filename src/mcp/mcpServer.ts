import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getVersion } from '../core/file/packageJsonParse.js';
import { logger } from '../shared/logger.js';
import { registerPackRemoteRepositoryPrompt } from './prompts/packRemoteRepositoryPrompts.js';
import { registerFileSystemReadDirectoryTool } from './tools/fileSystemReadDirectoryTool.js';
import { registerFileSystemReadFileTool } from './tools/fileSystemReadFileTool.js';
import { registerGrepRepomixOutputTool } from './tools/grepRepomixOutputTool.js';
import { registerPackCodebaseTool } from './tools/packCodebaseTool.js';
import { registerPackRemoteRepositoryTool } from './tools/packRemoteRepositoryTool.js';
import { registerReadRepomixOutputTool } from './tools/readRepomixOutputTool.js';

export const createMcpServer = async () => {
  const mcpServer = new McpServer({
    name: 'repomix-mcp-server',
    version: await getVersion(),
  });

  // Register the prompts
  registerPackRemoteRepositoryPrompt(mcpServer);

  // Register the tools
  registerPackCodebaseTool(mcpServer);
  registerPackRemoteRepositoryTool(mcpServer);
  registerReadRepomixOutputTool(mcpServer);
  registerGrepRepomixOutputTool(mcpServer);
  registerFileSystemReadFileTool(mcpServer);
  registerFileSystemReadDirectoryTool(mcpServer);

  return mcpServer;
};

type Dependencies = {
  processExit?: (code?: number) => never;
};

const defaultDependencies: Dependencies = {
  processExit: process.exit,
};

export const runMcpServer = async (deps: Dependencies = defaultDependencies) => {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  const processExit = deps.processExit ?? process.exit;

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
