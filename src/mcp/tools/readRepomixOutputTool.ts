import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  convertErrorToJson,
  getOutputFilePath,
} from './mcpToolRuntime.js';

const readRepomixOutputInputSchema = z.object({
  outputId: z.string().describe('ID of the Repomix output file to read'),
  startLine: z.coerce
    .number()
    .optional()
    .describe('Starting line number (1-based, inclusive). If not specified, reads from beginning.'),
  endLine: z.coerce
    .number()
    .optional()
    .describe('Ending line number (1-based, inclusive). If not specified, reads to end.'),
});

const readRepomixOutputOutputSchema = z.object({
  content: z.string().describe('The file content or specified line range'),
  totalLines: z.number().describe('Total number of lines in the file'),
  linesRead: z.number().describe('Number of lines actually read'),
  startLine: z.number().optional().describe('Starting line number used'),
  endLine: z.number().optional().describe('Ending line number used'),
});

/**
 * Register the tool to read Repomix output files
 */
export const registerReadRepomixOutputTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'read_repomix_output',
    {
      title: 'Read Repomix Output',
      description:
        'Read the contents of a Repomix-generated output file. Supports partial reading with line range specification for large files. This tool is designed for environments where direct file system access is limited (e.g., web-based environments, sandboxed applications). For direct file system access, use standard file operations.',
      inputSchema: readRepomixOutputInputSchema,
      outputSchema: readRepomixOutputOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ outputId, startLine, endLine }): Promise<CallToolResult> => {
      try {
        logger.trace(`Reading Repomix output with ID: ${outputId}`);

        // Get the file path from the registry
        const filePath = getOutputFilePath(outputId);
        if (!filePath) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Output file with ID ${outputId} not found. The output file may have been deleted or the ID is invalid.`,
          });
        }

        // Check if the file exists
        try {
          await fs.access(filePath);
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Output file does not exist at path: ${filePath}. The temporary file may have been cleaned up.`,
          });
        }

        // Read the file content
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const totalLines = lines.length;

        let processedContent = content;
        let actualStartLine = 1;
        let actualEndLine = totalLines;
        let linesRead = totalLines;

        if (startLine !== undefined || endLine !== undefined) {
          // Validate that startLine and endLine are positive values
          if (startLine !== undefined && startLine < 1) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: Start line must be >= 1, got ${startLine}.`,
            });
          }

          if (endLine !== undefined && endLine < 1) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: End line must be >= 1, got ${endLine}.`,
            });
          }

          // Validate that startLine is less than or equal to endLine when both are provided
          if (startLine !== undefined && endLine !== undefined && startLine > endLine) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: Start line (${startLine}) cannot be greater than end line (${endLine}).`,
            });
          }

          const start = Math.max(0, (startLine || 1) - 1);
          const end = endLine ? Math.min(lines.length, endLine) : lines.length;

          if (start >= lines.length) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: Start line ${startLine} exceeds total lines (${lines.length}) in the file.`,
            });
          }

          processedContent = lines.slice(start, end).join('\n');
          actualStartLine = start + 1;
          actualEndLine = end;
          linesRead = end - start;
        }

        return buildMcpToolSuccessResponse({
          content: processedContent,
          totalLines,
          linesRead,
          startLine: startLine || actualStartLine,
          endLine: endLine || actualEndLine,
        } satisfies z.infer<typeof readRepomixOutputOutputSchema>);
      } catch (error) {
        logger.error(`Error reading Repomix output: ${error}`);
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
