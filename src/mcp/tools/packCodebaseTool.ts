import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { runCli } from '../../cli/cliRun.js';
import type { CliOptions } from '../../cli/types.js';
import { defaultFilePathMap } from '../../config/configSchema.js';
import {
  buildMcpToolErrorResponse,
  convertErrorToJson,
  createToolWorkspace,
  formatPackToolResponse,
} from './mcpToolRuntime.js';

const packCodebaseInputSchema = z.object({
  directory: z.string().describe('Directory to pack (Absolute path)'),
  compress: z
    .boolean()
    .default(false)
    .describe(
      'Enable Tree-sitter compression to extract essential code signatures and structure while removing implementation details. Reduces token usage by ~70% while preserving semantic meaning. Generally not needed since grep_repomix_output allows incremental content retrieval. Use only when you specifically need the entire codebase content for large repositories (default: false).',
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
    .int()
    .min(1)
    .optional()
    .default(10)
    .describe('Number of largest files by size to display in the metrics summary for codebase analysis (default: 10)'),
  style: z
    .enum(['xml', 'markdown', 'json', 'plain'])
    .default('xml')
    .describe(
      'Output format style: xml (structured tags, default), markdown (human-readable with code blocks), json (machine-readable key-value), or plain (simple text with separators)',
    ),
});

const packCodebaseOutputSchema = z.object({
  description: z.string().describe('Human-readable description of the packing results'),
  result: z.string().describe('JSON string containing detailed metrics and file information'),
  directoryStructure: z.string().describe('Tree structure of the processed directory'),
  outputId: z.string().describe('Unique identifier for accessing the packed content'),
  outputFilePath: z.string().describe('File path to the generated output file'),
  totalFiles: z.number().describe('Total number of files processed'),
  totalTokens: z.number().describe('Total token count of the content'),
});

export const registerPackCodebaseTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'pack_codebase',
    {
      title: 'Pack Local Codebase',
      description:
        'Package a local code directory into a consolidated file for AI analysis. This tool analyzes the codebase structure, extracts relevant code content, and generates a comprehensive report including metrics, file tree, and formatted code content. Supports multiple output formats: XML (structured with <file> tags), Markdown (human-readable with ## headers and code blocks), JSON (machine-readable with files as key-value pairs), and Plain text (simple format with separators). Also supports Tree-sitter compression for efficient token usage.',
      inputSchema: packCodebaseInputSchema,
      outputSchema: packCodebaseOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({
      directory,
      compress,
      includePatterns,
      ignorePatterns,
      topFilesLength,
      style,
    }): Promise<CallToolResult> => {
      let tempDir = '';

      try {
        tempDir = await createToolWorkspace();
        const outputFileName = defaultFilePathMap[style as keyof typeof defaultFilePathMap];
        const outputFilePath = path.join(tempDir, outputFileName);

        const cliOptions = {
          compress,
          include: includePatterns,
          ignore: ignorePatterns,
          output: outputFilePath,
          style,
          securityCheck: true,
          topFilesLen: topFilesLength,
          quiet: true,
        } as CliOptions;

        const result = await runCli(['.'], directory, cliOptions);
        if (!result) {
          return buildMcpToolErrorResponse({
            errorMessage: 'Failed to return a result',
          });
        }

        // Extract metrics information from the pack result
        const { packResult } = result;

        return await formatPackToolResponse({ directory }, packResult, outputFilePath, topFilesLength);
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
