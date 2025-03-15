import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { SuspiciousFileResult } from '../../core/security/securityCheck.js';
import { createSecretLintConfig, runSecretLint } from '../../core/security/workers/securityCheckWorker.js';
import { logger } from '../../shared/logger.js';

/**
 * Register file system read file tool with security checks
 */
export const registerFileSystemReadFileTool = (mcpServer: McpServer) => {
  mcpServer.tool(
    'file_system_read_file',
    'Read a file using an absolute path with security validation.',
    {
      path: z.string().describe('Absolute path to the file to read'),
    },
    async ({ path: filePath }): Promise<CallToolResult> => {
      try {
        logger.trace(`Reading file at absolute path: ${filePath}`);

        // Ensure path is absolute
        if (!path.isAbsolute(filePath)) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Path must be absolute. Received: ${filePath}`,
              },
            ],
          };
        }

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: File not found at path: ${filePath}`,
              },
            ],
          };
        }

        // Check if it's a directory
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: The specified path is a directory, not a file: ${filePath}. Use file_system_read_directory for directories.`,
              },
            ],
          };
        }

        // Read file content
        const fileContent = await fs.readFile(filePath, 'utf8');

        // Perform security check using the existing worker
        const config = createSecretLintConfig();
        const securityCheckResult = await runSecretLint(filePath, fileContent, config);

        // If security check found issues, block the file
        if (securityCheckResult !== null) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Security check failed. The file at ${filePath} may contain sensitive information.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Content of ${filePath}:`,
            },
            {
              type: 'text',
              text: fileContent,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in file_system_read_file tool: ${error}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
};
