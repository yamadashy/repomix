import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../shared/logger.js';

// Map to store generated output files
const outputFileRegistry = new Map<string, string>();

// Register an output file
export const registerOutputFile = (id: string, filePath: string): void => {
  outputFileRegistry.set(id, filePath);
};

// Get file path from output ID
export const getOutputFilePath = (id: string): string | undefined => {
  return outputFileRegistry.get(id);
};

export interface McpToolMetrics {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
}

export interface McpToolContext {
  directory?: string;
  repository?: string;
}

/**
 * Creates a temporary directory for MCP tool operations
 */
export const createToolWorkspace = async (): Promise<string> => {
  try {
    const tmpBaseDir = path.join(os.tmpdir(), 'repomix', 'mcp-outputs');
    await fs.mkdir(tmpBaseDir, { recursive: true });
    const tempDir = await fs.mkdtemp(`${tmpBaseDir}/`);
    return tempDir;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create temporary directory: ${message}`);
  }
};

/**
 * Generate a unique output ID
 */
export const generateOutputId = (): string => {
  return crypto.randomBytes(8).toString('hex');
};

/**
 * Creates a result object with metrics information for MCP tools
 */
export const formatToolResponse = (
  context: McpToolContext,
  metrics: McpToolMetrics,
  outputFilePath: string,
  topFilesLen = 5,
): CallToolResult => {
  // Generate output ID and register the file
  const outputId = generateOutputId();
  registerOutputFile(outputId, outputFilePath);

  // Get top files by character count
  const topFiles = Object.entries(metrics.fileCharCounts)
    .map(([filePath, charCount]) => ({
      path: filePath,
      charCount,
      tokenCount: metrics.fileTokenCounts[filePath] || 0,
    }))
    .sort((a, b) => b.charCount - a.charCount)
    .slice(0, topFilesLen);

  // Create JSON string with all the metrics information
  const jsonResult = JSON.stringify(
    {
      ...(context.directory ? { directory: context.directory } : {}),
      ...(context.repository ? { repository: context.repository } : {}),
      outputFilePath,
      outputId,
      metrics: {
        totalFiles: metrics.totalFiles,
        totalCharacters: metrics.totalCharacters,
        totalTokens: metrics.totalTokens,
        topFiles,
      },
    },
    null,
    2,
  );

  return {
    content: [
      {
        type: 'text',
        text: '🎉 Successfully packed codebase!\nPlease review the metrics below and consider adjusting compress/includePatterns/ignorePatterns if the token count is too high and you need to reduce it before reading the file content.',
      },
      {
        type: 'text',
        text: jsonResult,
      },
      {
        type: 'resource',
        resource: {
          text: 'Repomix output file',
          uri: `file://${outputFilePath}`,
          mimeType: 'application/xml',
        },
      },
      {
        type: 'text',
        text: `For environments without direct file access (e.g., web browsers or sandboxed apps), use the read_repomix_output tool with this outputId: ${outputId} to access the packed codebase contents.`,
      },
    ],
  };
};

/**
 * Creates an error result for MCP tools
 */
export const formatToolError = (error: unknown): CallToolResult => {
  logger.error(`Error in MCP tool: ${error instanceof Error ? error.message : String(error)}`);

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      },
    ],
  };
};
