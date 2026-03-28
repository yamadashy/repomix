import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  convertErrorToJson,
  getOutputContent,
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

        // Validate line range parameters early (before any I/O)
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
        if (startLine !== undefined && endLine !== undefined && startLine > endLine) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Start line (${startLine}) cannot be greater than end line (${endLine}).`,
          });
        }

        // Get cached content — avoids re-reading multi-MB output files from disk
        // on repeated read_repomix_output calls (~5-10ms I/O + ~3ms line counting
        // saved per cache hit on 10MB outputs).
        const cached = await getOutputContent(outputId);
        if (!cached) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Output file with ID ${outputId} not found. The output file may have been deleted or the ID is invalid.`,
          });
        }

        const { content, totalLines } = cached;

        let processedContent = content;
        let actualStartLine = 1;
        let actualEndLine = totalLines;
        let linesRead = totalLines;

        if (startLine !== undefined || endLine !== undefined) {
          const start = Math.max(0, (startLine || 1) - 1);
          const end = endLine ? Math.min(totalLines, endLine) : totalLines;

          if (start >= totalLines) {
            return buildMcpToolErrorResponse({
              errorMessage: `Error: Start line ${startLine} exceeds total lines (${totalLines}) in the file.`,
            });
          }

          // Extract the requested line range using indexOf — avoids allocating an
          // N-element array from split('\n') which is costly for large outputs (10MB+
          // = 200K+ lines). Instead, scan for the start/end newline positions and slice
          // a single substring. O(n) scan but O(1) allocation vs O(n) allocation.
          let lineStart = 0;
          // Skip to the start line
          for (let line = 0; line < start && lineStart < content.length; line++) {
            const nl = content.indexOf('\n', lineStart);
            if (nl === -1) {
              lineStart = content.length;
              break;
            }
            lineStart = nl + 1;
          }
          // Find the end line position
          let lineEnd = lineStart;
          for (let line = start; line < end && lineEnd < content.length; line++) {
            const nl = content.indexOf('\n', lineEnd);
            if (nl === -1) {
              lineEnd = content.length;
              break;
            }
            lineEnd = line < end - 1 ? nl + 1 : nl;
          }
          // Handle edge case: if lineEnd didn't advance (start == end or past content)
          if (lineEnd === lineStart && start < totalLines) {
            const nl = content.indexOf('\n', lineEnd);
            lineEnd = nl === -1 ? content.length : nl;
          }
          processedContent = content.slice(lineStart, lineEnd);
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
