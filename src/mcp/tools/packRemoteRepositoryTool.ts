import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { runCli } from '../../cli/cliRun.js';
import type { CliOptions } from '../../cli/types.js';
import { createToolWorkspace, formatToolError, formatToolResponse } from './mcpToolRuntime.js';

export const registerPackRemoteRepositoryTool = (mcpServer: McpServer) => {
  mcpServer.tool(
    'pack_remote_repository',
    'Fetch, clone, and package a GitHub repository into a consolidated XML file for AI analysis. This tool automatically clones the remote repository, analyzes its structure, and generates a comprehensive report. Supports various GitHub URL formats and includes security checks to prevent exposure of sensitive information.',
    {
      remote: z
        .string()
        .describe(
          'GitHub repository URL or user/repo format (e.g., "yamadashy/repomix", "https://github.com/user/repo", or "https://github.com/user/repo/tree/branch")',
        ),
      compress: z
        .boolean()
        .default(false)
        .describe(
          'Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Significantly reduces token usage by ~70% while preserving semantic meaning. For large codebases, it is recommended to either enable this option or use grep_repomix_output to retrieve content incrementally (default: false).',
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
      title: 'Pack Remote Repository',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ remote, compress, includePatterns, ignorePatterns, topFilesLength }): Promise<CallToolResult> => {
      let tempDir = '';

      try {
        tempDir = await createToolWorkspace();
        const outputFilePath = path.join(tempDir, 'repomix-output.xml');

        const cliOptions = {
          remote,
          compress,
          include: includePatterns,
          ignore: ignorePatterns,
          output: outputFilePath,
          style: 'xml',
          securityCheck: true,
          topFilesLen: topFilesLength,
          quiet: true,
        } as CliOptions;

        const result = await runCli(['.'], process.cwd(), cliOptions);
        if (!result) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Failed to return a result',
              },
            ],
          };
        }

        // Extract metrics information from the pack result
        const { packResult } = result;

        const metricsWithLines = { ...packResult, totalLines: 0 };

        return await formatToolResponse({ repository: remote }, metricsWithLines, outputFilePath, topFilesLength);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
};
