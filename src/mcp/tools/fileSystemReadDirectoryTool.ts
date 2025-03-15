import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';

/**
 * Register file system directory listing tool
 */
export const registerFileSystemReadDirectoryTool = (mcpServer: McpServer) => {
  mcpServer.tool(
    'file_system_read_directory',
    'List contents of a directory using an absolute path.',
    {
      path: z.string().describe('Absolute path to the directory to list'),
    },
    async ({ path: directoryPath }): Promise<CallToolResult> => {
      try {
        logger.trace(`Listing directory at absolute path: ${directoryPath}`);

        // Ensure path is absolute
        if (!path.isAbsolute(directoryPath)) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Path must be absolute. Received: ${directoryPath}`,
              },
            ],
          };
        }

        // Check if directory exists
        try {
          const stats = await fs.stat(directoryPath);
          if (!stats.isDirectory()) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Error: The specified path is not a directory: ${directoryPath}. Use file_system_read_file for files.`,
                },
              ],
            };
          }
        } catch {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Directory not found at path: ${directoryPath}`,
              },
            ],
          };
        }

        // Read directory contents
        const entries = await fs.readdir(directoryPath, { withFileTypes: true });
        const formatted = entries
          .map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Contents of ${directoryPath}:`,
            },
            {
              type: 'text',
              text: formatted || '(empty directory)',
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in file_system_read_directory tool: ${error}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
};
