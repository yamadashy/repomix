import { runMcpServer } from '../../mcp/mcpServer.js';
import { applySandboxOrExit } from '../../mcp/sandbox/sandbox.js';
import { logger } from '../../shared/logger.js';

export const runMcpAction = async (
  options: { sandboxed?: boolean; strict?: boolean; cwd?: string } = {},
): Promise<void> => {
  const root = options.cwd ?? process.cwd();
  const strict = options.strict === true;
  // strict implies the software guard, so "strict but not sandboxed" can't reach the server.
  const sandboxed = strict || options.sandboxed === true;

  // Plain --sandbox never loads a kernel backend, which keeps it portable.
  if (strict) {
    await applySandboxOrExit({ root });
  }

  const mode = strict ? ' (sandboxed, kernel-strict)' : sandboxed ? ' (sandboxed, software)' : '';
  logger.trace(`Starting Repomix MCP server${mode}...`);
  await runMcpServer({ sandboxed, root });
};
