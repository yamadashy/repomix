import { runMcpServer } from '../../mcp/mcpServer.js';
import { logger } from '../../shared/logger.js';

export const runMcpAction = async (): Promise<void> => {
  logger.trace('Starting Repomix MCP server...');
  await runMcpServer();
};
