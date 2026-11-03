import { runMcpServer } from '../../mcp/mcpServer.js';
import { logger } from '../../shared/logger.js';

export const runMcpAction = async (
  options: { sandboxed?: boolean; cwd?: string } = {},
  deps = {
    runMcpServer,
  },
): Promise<void> => {
  const root = options.cwd ?? process.cwd();
  logger.trace(`Starting Repomix MCP server${options.sandboxed ? ' (sandboxed)' : ''}...`);
  await deps.runMcpServer({ sandboxed: options.sandboxed === true, root });
};
