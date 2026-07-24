import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import type { McpServerConfig } from '../mcpServer.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  buildSandboxErrorResponse,
  resolveToolPath,
} from './mcpToolRuntime.js';

const fileSystemReadDirectoryInputSchema = z.object({
  path: z.string(),
});

const fileSystemReadDirectoryOutputSchema = z.object({
  path: z.string().describe('The directory path that was listed'),
  contents: z.array(z.string()).describe('Array of directory contents with [FILE]/[DIR] indicators'),
  totalItems: z.number().describe('Total number of items in the directory'),
  fileCount: z.number().describe('Number of files in the directory'),
  directoryCount: z.number().describe('Number of subdirectories in the directory'),
});

/**
 * Register file system directory listing tool
 */
export const registerFileSystemReadDirectoryTool = (
  mcpServer: McpServer,
  config: McpServerConfig = { sandboxed: false, root: process.cwd() },
) => {
  const description = config.sandboxed
    ? 'List the contents of a directory in the workspace, at a path relative to the workspace root (e.g. "." or "src"). Returns a formatted list showing files and subdirectories with clear [FILE]/[DIR] indicators. Useful for exploring project structure and understanding codebase organization.'
    : 'List the contents of a directory using an absolute path. Returns a formatted list showing files and subdirectories with clear [FILE]/[DIR] indicators. Useful for exploring project structure and understanding codebase organization.';
  const inputSchema = fileSystemReadDirectoryInputSchema.extend({
    path: z
      .string()
      .describe(
        config.sandboxed
          ? 'Path to the directory to list, relative to the workspace root (e.g. "." or "src") — no "/", "~/", drive, or ".." segment.'
          : 'Absolute path to the directory to list',
      ),
  });

  mcpServer.registerTool(
    'file_system_read_directory',
    {
      title: 'Read Directory',
      description,
      inputSchema,
      outputSchema: fileSystemReadDirectoryOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ path: directoryPath }): Promise<CallToolResult> => {
      try {
        // Non-sandbox keeps the legacy absolute-path contract — guard it up front.
        if (!config.sandboxed && !path.isAbsolute(directoryPath)) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Path must be absolute. Received: ${directoryPath}`,
          });
        }
        // Sandbox: plain-relative → confined + virtualized. Non-sandbox: as-is.
        const { absPath, displayPath } = await resolveToolPath(config, directoryPath);

        logger.trace(`Listing directory at path: ${displayPath}`);

        // Check if directory exists
        try {
          const stats = await fs.stat(absPath);
          if (!stats.isDirectory()) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: The specified path is not a directory: ${displayPath}. Use file_system_read_file for files.`,
            });
          }
        } catch (error) {
          // Only a genuine "not found" maps to this message; other stat failures (e.g.
          // EACCES) bubble to the outer catch so they're categorized/redacted correctly.
          if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Directory not found at path: ${displayPath}`,
          });
        }

        // Read directory contents
        const entries = await fs.readdir(absPath, { withFileTypes: true });
        const contents = entries.map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`);

        const fileCount = entries.filter((entry) => entry.isFile()).length;
        const directoryCount = entries.filter((entry) => entry.isDirectory()).length;
        const totalItems = entries.length;

        return buildMcpToolSuccessResponse({
          path: displayPath,
          contents: contents.length > 0 ? contents : ['(empty directory)'],
          totalItems,
          fileCount,
          directoryCount,
        } satisfies z.infer<typeof fileSystemReadDirectoryOutputSchema>);
      } catch (error) {
        logger.error(`Error in file_system_read_directory tool: ${error}`); // full detail → operator (stderr)
        // Sandbox: a whitelisted, path-free reason + the agent's own input path; the
        // raw error.message (which can carry the absolute host path) is never
        // forwarded, so no host path can leak. Non-sandbox: the raw message is fine.
        if (config.sandboxed) return buildSandboxErrorResponse(error, directoryPath);
        const message = error instanceof Error ? error.message : String(error);
        return buildMcpToolErrorResponse({ errorMessage: `Error listing directory: ${message}` });
      }
    },
  );
};
