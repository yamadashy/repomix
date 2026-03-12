import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createSecretLintConfig, runSecretLint } from '../../core/security/workers/securityCheckWorker.js';
import { logger } from '../../shared/logger.js';
import { buildMcpToolErrorResponse, buildMcpToolSuccessResponse } from './mcpToolRuntime.js';

const fileSystemReadFileInputSchema = z.object({
  path: z.string().describe('Absolute path to the file to read'),
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
export const registerFileSystemReadFileTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'file_system_read_file',
    {
      title: 'Read File',
      description:
        'Read a file from the local file system using an absolute path. Includes built-in security validation to detect and prevent access to files containing sensitive information (API keys, passwords, secrets).',
      inputSchema: fileSystemReadFileInputSchema,
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
        logger.trace(`Reading file at absolute path: ${filePath}`);

        // Ensure path is absolute
        if (!path.isAbsolute(filePath)) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Path must be absolute. Received: ${filePath}`,
          });
        }

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: File not found at path: ${filePath}`,
          });
        }

        // Check if it's a directory
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: The specified path is a directory, not a file: ${filePath}. Use file_system_read_directory for directories.`,
          });
        }

        // Get file stats
        const fileStats = await fs.stat(filePath);

        // Read file content
        const fileContent = await fs.readFile(filePath, 'utf8');

        // Perform security check using the existing worker
        const config = createSecretLintConfig();
        const securityCheckResult = await runSecretLint(filePath, fileContent, 'file', config);

        // If security check found issues, block the file
        if (securityCheckResult !== null) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Security check failed. The file at ${filePath} may contain sensitive information.`,
          });
        }

        // Calculate file metrics
        const lines = fileContent.split('\n').length;
        const size = fileStats.size;

        return buildMcpToolSuccessResponse({
          path: filePath,
          content: fileContent,
          size,
          encoding: 'utf8',
          lines,
        } satisfies z.infer<typeof fileSystemReadFileOutputSchema>);
      } catch (error) {
        logger.error(`Error in file_system_read_file tool: ${error}`);
        return buildMcpToolErrorResponse({
          errorMessage: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  );
};
