import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { defaultFilePathMap } from '../../config/configSchema.js';
import type { ProcessedFile } from '../../core/file/fileTypes.js';
import {
  buildMcpToolErrorResponse,
  convertErrorToJson,
  formatPackToolResponse,
  type McpToolMetrics,
} from './mcpToolRuntime.js';

/**
 * Schema for the attach packed output tool input
 */
const attachPackedOutputInputSchema = z.object({
  path: z
    .string()
    .describe(
      'Path to a directory containing repomix output file or direct path to a packed repository file (supports .xml, .md, .txt, .json formats)',
    ),
  topFilesLength: z
    .number()
    .int()
    .min(1)
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
 * Resolves the path to a repomix output file and detects its format
 * @param inputPath Path to a directory containing repomix output file or direct path to a packed repository file
 * @returns Object containing the resolved path and detected format
 * @throws Error if the file doesn't exist or isn't a supported format
 */
async function resolveOutputFilePath(inputPath: string): Promise<{ filePath: string; format: string }> {
  try {
    const stats = await fs.stat(inputPath);

    if (stats.isDirectory()) {
      // If it's a directory, look for repomix output files in priority order
      const possibleFiles = Object.values(defaultFilePathMap);

      for (const fileName of possibleFiles) {
        const outputFilePath = path.join(inputPath, fileName);
        try {
          await fs.access(outputFilePath);
          const format = getFormatFromFileName(fileName);
          return { filePath: outputFilePath, format };
        } catch {
          // File doesn't exist, continue to next
        }
      }

      throw new Error(
        `No repomix output file found in directory: ${inputPath}. Looking for: ${possibleFiles.join(', ')}`,
      );
    }

    // If it's a file, check if it's a supported format
    const supportedExtensions = Object.values(defaultFilePathMap).map((file) => path.extname(file));
    const fileExtension = path.extname(inputPath).toLowerCase();

    if (!supportedExtensions.includes(fileExtension)) {
      throw new Error(
        `Unsupported file format: ${fileExtension}. Supported formats: ${supportedExtensions.join(', ')}`,
      );
    }

    const format = getFormatFromExtension(fileExtension);
    return { filePath: inputPath, format };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`File or directory not found for path: ${inputPath}`, { cause: error });
    }
    throw error;
  }
}

/**
 * Get format from file name
 */
function getFormatFromFileName(fileName: string): string {
  for (const [format, defaultFileName] of Object.entries(defaultFilePathMap)) {
    if (fileName === defaultFileName) {
      return format;
    }
  }
  return 'xml'; // fallback
}

/**
 * Get format from file extension
 */
function getFormatFromExtension(extension: string): string {
  switch (extension) {
    case '.xml':
      return 'xml';
    case '.md':
      return 'markdown';
    case '.txt':
      return 'plain';
    case '.json':
      return 'json';
    default:
      return 'xml'; // fallback
  }
}

/**
 * Extract file paths and character counts from a repomix output XML file
 * @param content The content of the repomix output XML file
 * @returns An object containing an array of file paths and a record of file paths to character counts
 */
function extractFileMetrics(
  content: string,
  format: string,
): { filePaths: string[]; fileCharCounts: Record<string, number> } {
  switch (format) {
    case 'xml':
      return extractFileMetricsXml(content);
    case 'markdown':
      return extractFileMetricsMarkdown(content);
    case 'plain':
      return extractFileMetricsPlain(content);
    case 'json':
      return extractFileMetricsJson(content);
    default:
      // Fallback to XML parsing
      return extractFileMetricsXml(content);
  }
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
 * Extract file metrics from XML format
 */
function extractFileMetricsXml(content: string): { filePaths: string[]; fileCharCounts: Record<string, number> } {
  const filePaths: string[] = [];
  const fileCharCounts: Record<string, number> = {};
  const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;

  for (const match of content.matchAll(fileRegex)) {
    const filePath = match[1];
    const fileContent = match[2];
    filePaths.push(filePath);
    fileCharCounts[filePath] = fileContent.length;
  }

  return { filePaths, fileCharCounts };
}

/**
 * Extract file metrics from Markdown format
 */
function extractFileMetricsMarkdown(content: string): { filePaths: string[]; fileCharCounts: Record<string, number> } {
  const filePaths: string[] = [];
  const fileCharCounts: Record<string, number> = {};

  // Pattern: ## File: [path] followed by code block
  const fileRegex = /## File: ([^\r\n]+)\r?\n```[^\r\n]*\r?\n([\s\S]*?)```/g;

  for (const match of content.matchAll(fileRegex)) {
    const filePath = match[1];
    const fileContent = match[2];
    filePaths.push(filePath);
    fileCharCounts[filePath] = fileContent.length;
  }

  return { filePaths, fileCharCounts };
}

/**
 * Extract file metrics from Plain text format
 */
function extractFileMetricsPlain(content: string): { filePaths: string[]; fileCharCounts: Record<string, number> } {
  const filePaths: string[] = [];
  const fileCharCounts: Record<string, number> = {};

  // Pattern: separator lines with "File: [path]" followed by content
  const fileRegex = /={16,}\r?\nFile: ([^\r\n]+)\r?\n={16,}\r?\n([\s\S]*?)(?=\r?\n={16,}\r?\n|$)/g;

  for (const match of content.matchAll(fileRegex)) {
    const filePath = match[1];
    const fileContent = match[2].trim();
    filePaths.push(filePath);
    fileCharCounts[filePath] = fileContent.length;
  }

  return { filePaths, fileCharCounts };
}

/**
 * Extract file metrics from JSON format
 */
function extractFileMetricsJson(content: string): { filePaths: string[]; fileCharCounts: Record<string, number> } {
  const filePaths: string[] = [];
  const fileCharCounts: Record<string, number> = {};

  try {
    const jsonData = JSON.parse(content);
    const files = jsonData.files || {};

    for (const [filePath, fileContent] of Object.entries(files)) {
      if (typeof fileContent === 'string') {
        filePaths.push(filePath);
        fileCharCounts[filePath] = fileContent.length;
      }
    }
  } catch {
    // If JSON parsing fails, return empty results
  }

  return { filePaths, fileCharCounts };
}

/**
 * Register the attach packed output tool with the MCP server
 */
export const registerAttachPackedOutputTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'attach_packed_output',
    {
      title: 'Attach Packed Output',
      description: `Attach an existing Repomix packed output file for AI analysis.
This tool accepts either a directory containing a repomix output file or a direct path to a packed repository file.
Supports multiple formats: XML (structured with <file> tags), Markdown (human-readable with ## headers and code blocks), JSON (machine-readable with files as key-value pairs), and Plain text (simple format with separators).
Calling the tool again with the same file path will refresh the content if the file has been updated.
It will return in that case a new output ID and the updated content.`,
      inputSchema: attachPackedOutputInputSchema,
      outputSchema: attachPackedOutputOutputSchema,
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
        const { filePath: outputFilePath, format } = await resolveOutputFilePath(inputPath);

        // Read the file content
        const content = await fs.readFile(outputFilePath, 'utf8');

        // Extract file paths and character counts from the content
        const { filePaths, fileCharCounts } = extractFileMetrics(content, format);

        // Calculate metrics
        const totalCharacters = Object.values(fileCharCounts).reduce((sum, count) => sum + count, 0);
        const totalTokens = Math.floor(totalCharacters / 4); // Rough estimate of tokens

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
