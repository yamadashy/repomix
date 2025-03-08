import { logger } from "../../shared/logger.js";
import { runMcpServer } from "../../core/mcp/mcpServer.js";

export const runMcpAction = async (): Promise<void> => {
  logger.trace('Starting Repomix MCP server...');
  await runMcpServer();
};
