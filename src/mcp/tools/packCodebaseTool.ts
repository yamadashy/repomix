import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { runCli } from '../../cli/cliRun.js';
import type { CliOptions } from '../../cli/types.js';
import { createToolWorkspace, formatToolError, formatToolResponse } from './mcpToolRuntime.js';

export const registerPackCodebaseTool = (mcpServer: McpServer) => {
  mcpServer.tool(
    'pack_codebase',
    'Package a local code directory into a consolidated XML file for AI analysis. This tool analyzes the codebase structure, extracts relevant code content, and generates a comprehensive report including metrics, file tree, and formatted code content. Supports Tree-sitter compression for efficient token usage.',
    {
      directory: z.string().describe('Directory to pack (Absolute path)'),
      compress: z
        .boolean()
        .default(true)
        .describe(
          'Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Significantly reduces token usage by ~70% while preserving semantic meaning. Recommended for large codebases (default: true).',
        ),
      includePatterns: z
        .string()
        .optional()
        .describe(
          'Specify files to include using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "**/*.{js,ts}", "src/**,docs/**"). Only matching files will be processed. Useful for focusing on specific parts of the codebase.',
        ),
      ignorePatterns: z
        .string()
        .optional()
        .describe(
          'Specify additional files to exclude using fast-glob patterns. Multiple patterns can be comma-separated (e.g., "test/**,*.spec.js", "node_modules/**,dist/**"). These patterns supplement .gitignore and built-in exclusions.',
        ),
      topFilesLength: z
        .number()
        .optional()
        .default(10)
        .describe(
          'Number of largest files by size to display in the metrics summary for codebase analysis (default: 10)',
        ),
    },
    {
      title: 'Pack Local Codebase',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    async ({ directory, compress, includePatterns, ignorePatterns, topFilesLength }): Promise<CallToolResult> => {
      let tempDir = '';

      try {
        tempDir = await createToolWorkspace();
        const outputFilePath = path.join(tempDir, 'repomix-output.xml');

        const cliOptions = {
          compress,
          include: includePatterns,
          ignore: ignorePatterns,
          output: outputFilePath,
          style: 'xml',
          securityCheck: true,
          topFilesLen: topFilesLength,
          quiet: true,
        } as CliOptions;

        const result = await runCli(['.'], directory, cliOptions);
        if (!result) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Failed to return a result',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Extract metrics information from the pack result
        const { packResult } = result;

        const metricsWithLines = { ...packResult, totalLines: 0 };

        return await formatToolResponse({ directory }, metricsWithLines, outputFilePath, topFilesLength);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
};
