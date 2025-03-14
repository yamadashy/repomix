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
    'Fetch, clone and package a GitHub repository into a consolidated file for AI analysis',
    {
      remote: z.string().describe('GitHub repository URL or user/repo (e.g., yamadashy/repomix)'),
      compress: z
        .boolean()
        .default(true)
        .describe(
          'Utilize Tree-sitter to intelligently extract essential code signatures and structure while removing implementation details, significantly reducing token usage (default: true)',
        ),
      includePatterns: z
        .string()
        .optional()
        .describe(
          'Specify which files to include using fast-glob compatible patterns (e.g., "**/*.js,src/**"). Only files matching these patterns will be processed',
        ),
      ignorePatterns: z
        .string()
        .optional()
        .describe(
          'Specify additional files to exclude using fast-glob compatible patterns (e.g., "test/**,*.spec.js"). These patterns complement .gitignore and default ignores',
        ),
      topFilesLength: z
        .number()
        .optional()
        .default(5)
        .describe('Number of top files to display in the metrics (default: 5)'),
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

        return formatToolResponse({ repository: remote }, packResult, outputFilePath, topFilesLength);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
};
