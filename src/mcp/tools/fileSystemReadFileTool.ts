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

        // Check if file exists and get stats in a single syscall (replaces
        // redundant fs.access + two separate fs.stat calls — saves 2 syscalls per read)
        let stats: Awaited<ReturnType<typeof fs.stat>>;
        try {
          stats = await fs.stat(filePath);
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: File not found at path: ${filePath}`,
          });
        }

        if (stats.isDirectory()) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: The specified path is a directory, not a file: ${filePath}. Use file_system_read_directory for directories.`,
          });
        }

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

        // Count lines using indexOf loop — O(1) allocation vs split('\n') which
        // creates an N-element array for a metric that only needs a count.
        let lines = 1;
        let pos = fileContent.indexOf('\n');
        while (pos !== -1) {
          lines++;
          pos = fileContent.indexOf('\n', pos + 1);
        }
        const size = stats.size;

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
