import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import { buildMcpToolErrorResponse, buildMcpToolSuccessResponse } from './mcpToolRuntime.js';

const fileSystemReadDirectoryInputSchema = z.object({
  path: z.string().describe('Absolute path to the directory to list'),
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
export const registerFileSystemReadDirectoryTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'file_system_read_directory',
    {
      title: 'Read Directory',
      description:
        'List the contents of a directory using an absolute path. Returns a formatted list showing files and subdirectories with clear [FILE]/[DIR] indicators. Useful for exploring project structure and understanding codebase organization.',
      inputSchema: fileSystemReadDirectoryInputSchema,
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
        logger.trace(`Listing directory at absolute path: ${directoryPath}`);

        // Ensure path is absolute
        if (!path.isAbsolute(directoryPath)) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Path must be absolute. Received: ${directoryPath}`,
          });
        }

        // Check if directory exists
        try {
          const stats = await fs.stat(directoryPath);
          if (!stats.isDirectory()) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: The specified path is not a directory: ${directoryPath}. Use file_system_read_file for files.`,
            });
          }
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Directory not found at path: ${directoryPath}`,
          });
        }

        // Read directory contents
        const entries = await fs.readdir(directoryPath, { withFileTypes: true });
        const contents = entries.map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`);

        const fileCount = entries.filter((entry) => entry.isFile()).length;
        const directoryCount = entries.filter((entry) => entry.isDirectory()).length;
        const totalItems = entries.length;

        return buildMcpToolSuccessResponse({
          path: directoryPath,
          contents: contents.length > 0 ? contents : ['(empty directory)'],
          totalItems,
          fileCount,
          directoryCount,
        } satisfies z.infer<typeof fileSystemReadDirectoryOutputSchema>);
      } catch (error) {
        logger.error(`Error in file_system_read_directory tool: ${error}`);
        return buildMcpToolErrorResponse({
          errorMessage: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  );
};
