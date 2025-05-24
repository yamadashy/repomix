import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import { getOutputFilePath } from './mcpToolRuntime.js';

/**
 * Register the tool to search Repomix output files with grep-like functionality
 */
export const registerGrepRepomixOutputTool = (mcpServer: McpServer) => {
  mcpServer.tool(
    'grep_repomix_output',
    'Search for patterns in a Repomix output file using grep-like functionality. Returns matching lines with optional context lines around matches.',
    {
      outputId: z.string().describe('ID of the Repomix output file to search'),
      pattern: z.string().describe('Search pattern (regular expression)'),
      contextLines: z
        .number()
        .default(0)
        .describe('Number of context lines to show before and after each match (default: 0)'),
      ignoreCase: z.boolean().default(false).describe('Perform case-insensitive matching (default: false)'),
    },
    {
      title: 'Grep Repomix Output',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ outputId, pattern, contextLines = 0, ignoreCase = false }): Promise<CallToolResult> => {
      try {
        logger.trace(`Searching Repomix output with ID: ${outputId}, pattern: ${pattern}`);

        const filePath = getOutputFilePath(outputId);
        if (!filePath) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Output file with ID ${outputId} not found. The output file may have been deleted or the ID is invalid.`,
              },
            ],
          };
        }

        try {
          await fs.access(filePath);
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Output file does not exist at path: ${filePath}. The temporary file may have been cleaned up.`,
              },
            ],
          };
        }

        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');

        const regexFlags = ignoreCase ? 'gi' : 'g';
        let regex: RegExp;
        try {
          regex = new RegExp(pattern, regexFlags);
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Invalid regular expression pattern: ${pattern}. ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }

        const matches: Array<{ lineNumber: number; line: string; matchedText: string }> = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = line.match(regex);
          if (match) {
            matches.push({
              lineNumber: i + 1,
              line,
              matchedText: match[0],
            });
          }
        }

        if (matches.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No matches found for pattern "${pattern}" in Repomix output file (ID: ${outputId}).`,
              },
            ],
          };
        }

        const resultLines: string[] = [];
        const addedLines = new Set<number>();

        for (const match of matches) {
          const start = Math.max(0, match.lineNumber - 1 - contextLines);
          const end = Math.min(lines.length - 1, match.lineNumber - 1 + contextLines);

          if (resultLines.length > 0 && start > Math.min(...addedLines) + 1) {
            resultLines.push('--');
          }

          for (let i = start; i <= end; i++) {
            if (!addedLines.has(i)) {
              const lineNum = i + 1;
              const prefix = i === match.lineNumber - 1 ? `${lineNum}:` : `${lineNum}-`;
              resultLines.push(`${prefix}${lines[i]}`);
              addedLines.add(i);
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${matches.length} match(es) for pattern "${pattern}" in Repomix output file (ID: ${outputId}):`,
            },
            {
              type: 'text',
              text: resultLines.join('\n'),
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in grep_repomix_output: ${error}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error searching Repomix output: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
};
