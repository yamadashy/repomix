import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { generateTreeString } from '../../core/file/fileTreeGenerate.js';
import type { ProcessedFile } from '../../core/file/fileTypes.js';
import {
  type McpToolMetrics,
  buildMcpToolErrorResponse,
  convertErrorToJson,
  formatPackToolResponse,
} from './mcpToolRuntime.js';

/**
 * Schema for the attach packed output tool input
 */
const attachPackedOutputInputSchema = z.object({
  path: z
    .string()
    .describe('Path to a directory containing repomix-output.xml or direct path to a packed repository XML file'),
  topFilesLength: z
    .number()
    .optional()
    .default(10)
    .describe('Number of largest files by size to display in the metrics summary (default: 10)'),
});

/**
 * Schema for the attach packed output tool output
 */
const attachPackedOutputOutputSchema = z.object({
  description: z.string().describe('Human-readable description of the attached output'),
  result: z.string().describe('JSON string containing detailed metrics and file information'),
  directoryStructure: z.string().describe('Tree structure extracted from the packed output'),
  outputId: z.string().describe('Unique identifier for accessing the packed content'),
  outputFilePath: z.string().describe('File path to the attached output file'),
  totalFiles: z.number().describe('Total number of files in the packed output'),
  totalTokens: z.number().describe('Total token count of the content'),
});

/**
 * Resolves the path to a repomix output file
 * @param inputPath Path to a directory containing repomix-output.xml or direct path to an XML file
 * @returns The resolved path to the repomix output file
 * @throws Error if the file doesn't exist or isn't a valid XML file
 */
async function resolveOutputFilePath(inputPath: string): Promise<string> {
  try {
    const stats = await fs.stat(inputPath);

    if (stats.isDirectory()) {
      // If it's a directory, look for repomix-output.xml inside
      const outputFilePath = path.join(inputPath, 'repomix-output.xml');
      await fs.access(outputFilePath); // Will throw if file doesn't exist
      return outputFilePath;
    }

    // If it's a file, check if it's an XML file
    if (!inputPath.toLowerCase().endsWith('.xml')) {
      throw new Error('The provided file is not an XML file. Only XML files are supported.');
    }
    return inputPath;
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`File or directory not found: ${inputPath}`);
    }
    throw error;
  }
}

/**
 * Extract file paths from a repomix output XML file
 * @param content The content of the repomix output XML file
 * @returns Array of file paths extracted from the XML
 */
function extractFilePaths(content: string): string[] {
  const filePaths: string[] = [];
  const filePathRegex = /<file path="([^"]+)">/g;
  let match: RegExpExecArray | null = filePathRegex.exec(content);

  while (match !== null) {
    filePaths.push(match[1]);
    match = filePathRegex.exec(content);
  }

  return filePaths;
}

/**
 * Calculate approximate file size in characters
 * @param content The content of the file
 * @param filePaths Array of file paths
 * @returns Record of file paths to character counts
 */
function calculateApproximateCharCounts(content: string, filePaths: string[]): Record<string, number> {
  // Simple approximation: distribute character count evenly among files
  const avgChars = Math.floor(content.length / filePaths.length);

  return filePaths.reduce(
    (acc, filePath) => {
      acc[filePath] = avgChars;
      return acc;
    },
    {} as Record<string, number>,
  );
}

/**
 * Create processed files from file paths
 * @param filePaths Array of file paths
 * @param charCounts Record of file paths to character counts
 * @returns Array of ProcessedFile objects
 */
function createProcessedFiles(filePaths: string[], charCounts: Record<string, number>): ProcessedFile[] {
  return filePaths.map((path) => ({
    path,
    content: ''.padEnd(charCounts[path]), // Create a string of the appropriate length
  }));
}

/**
 * Register the attach packed output tool with the MCP server
 */
export const registerAttachPackedOutputTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'attach_packed_output',
    {
      title: 'Attach Packed Output',
      description:
        'Attach an existing Repomix packed output file for AI analysis. This tool accepts either a directory containing a repomix-output.xml file or a direct path to an XML file. It registers the file with the MCP server and returns the same structure as the pack_codebase tool.',
      inputSchema: attachPackedOutputInputSchema.shape,
      outputSchema: attachPackedOutputOutputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ path: inputPath, topFilesLength }): Promise<CallToolResult> => {
      try {
        // Resolve the path to the repomix output file
        const outputFilePath = await resolveOutputFilePath(inputPath);

        // Read the file content
        const content = await fs.readFile(outputFilePath, 'utf8');

        // Extract file paths from the XML content
        const filePaths = extractFilePaths(content);

        // Calculate metrics
        const totalLines = content.split('\n').length;
        const totalCharacters = content.length;
        const totalTokens = Math.floor(totalCharacters / 4); // Rough estimate of tokens

        // Extract file paths and calculate approximate character counts
        const fileCharCounts = calculateApproximateCharCounts(content, filePaths);

        // Create approximate token counts (roughly 4 chars per token)
        const fileTokenCounts: Record<string, number> = {};
        for (const [filePath, charCount] of Object.entries(fileCharCounts)) {
          fileTokenCounts[filePath] = Math.floor(charCount / 4);
        }

        // Create processed files for the metrics
        const processedFiles = createProcessedFiles(filePaths, fileCharCounts);

        // Create metrics object similar to what packResult would provide
        const packResult: McpToolMetrics = {
          totalFiles: filePaths.length,
          totalCharacters,
          totalTokens,
          safeFilePaths: filePaths,
          fileCharCounts,
          fileTokenCounts,
          processedFiles,
        };

        // Create context object
        const context = {
          // Extract directory or repository name from the path
          directory: path.basename(path.dirname(outputFilePath)),
        };

        return await formatPackToolResponse(context, packResult, outputFilePath, topFilesLength);
      } catch (error) {
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
