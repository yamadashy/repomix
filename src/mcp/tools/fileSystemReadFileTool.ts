import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createSecretLintConfig, runSecretLint } from '../../core/security/workers/securityCheckWorker.js';
import { logger } from '../../shared/logger.js';
import type { McpServerConfig } from '../mcpServer.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  buildSandboxErrorResponse,
  resolveToolPath,
} from './mcpToolRuntime.js';

const fileSystemReadFileInputSchema = z.object({
  path: z.string(),
});

const fileSystemReadFileOutputSchema = z.object({
  path: z.string().describe('The file path that was read'),
  content: z.string().describe('The file content'),
  size: z.number().describe('File size in bytes'),
  encoding: z.string().describe('Text encoding used to read the file'),
  lines: z.number().describe('Number of lines in the file'),
});

/**
 * Register file system read file tool with security checks
 */
export const registerFileSystemReadFileTool = (
  mcpServer: McpServer,
  config: McpServerConfig = { sandboxed: false, root: process.cwd() },
) => {
  const description = config.sandboxed
    ? 'Read a file from the workspace, at a path relative to the workspace root (e.g. "src/index.ts"). Content matching known secret formats (API keys, passwords) is refused; that scan is a heuristic safeguard — access is bounded by the workspace root, not by the scan.'
    : 'Read a file from the local file system using an absolute path. Content matching known secret formats (API keys, passwords) is refused; that scan is a heuristic safeguard, not an access boundary.';
  const inputSchema = fileSystemReadFileInputSchema.extend({
    path: z
      .string()
      .describe(
        config.sandboxed
          ? 'Path to the file to read, relative to the workspace root (e.g. "src/index.ts") — no "/", "~/", drive, or ".." segment.'
          : 'Absolute path to the file to read',
      ),
  });

  mcpServer.registerTool(
    'file_system_read_file',
    {
      title: 'Read File',
      description,
      inputSchema,
      outputSchema: fileSystemReadFileOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ path: filePath }): Promise<CallToolResult> => {
      try {
        // Non-sandbox keeps the legacy absolute-path contract — guard it up front.
        if (!config.sandboxed && !path.isAbsolute(filePath)) {
          return buildMcpToolErrorResponse({ errorMessage: `Error: Path must be absolute. Received: ${filePath}` });
        }
        // Sandbox: plain-relative → confined + virtualized. Non-sandbox: as-is.
        const { absPath, displayPath } = await resolveToolPath(config, filePath);

        logger.trace(`Reading file at path: ${displayPath}`);

        // Check if file exists
        try {
          await fs.access(absPath);
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: File not found at path: ${displayPath}`,
          });
        }

        // Check if it's a directory (the same stat also carries the size below)
        const stats = await fs.stat(absPath);
        if (stats.isDirectory()) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: The specified path is a directory, not a file: ${displayPath}. Use file_system_read_directory for directories.`,
          });
        }

        // Read file content
        const fileContent = await fs.readFile(absPath, 'utf8');

        // Perform security check using the existing worker
        const secretLintConfig = createSecretLintConfig();
        const securityCheckResult = await runSecretLint(absPath, fileContent, 'file', secretLintConfig);

        // If security check found issues, block the file
        if (securityCheckResult !== null) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Security check failed. The file at ${displayPath} may contain sensitive information.`,
          });
        }

        // Calculate file metrics
        const lines = fileContent.split('\n').length;
        const size = stats.size;

        return buildMcpToolSuccessResponse({
          path: displayPath,
          content: fileContent,
          size,
          encoding: 'utf8',
          lines,
        } satisfies z.infer<typeof fileSystemReadFileOutputSchema>);
      } catch (error) {
        logger.error(`Error in file_system_read_file tool: ${error}`); // full detail → operator (stderr)
        // Sandbox: a whitelisted, path-free reason + the agent's own input path; the
        // raw error.message (which can carry the absolute host path) is never
        // forwarded, so no host path can leak. Non-sandbox: the raw message is fine.
        if (config.sandboxed) return buildSandboxErrorResponse(error, filePath);
        const message = error instanceof Error ? error.message : String(error);
        return buildMcpToolErrorResponse({ errorMessage: `Error reading file: ${message}` });
      }
    },
  );
};
