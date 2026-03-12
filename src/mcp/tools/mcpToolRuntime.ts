import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { generateTreeString } from '../../core/file/fileTreeGenerate.js';
import type { ProcessedFile } from '../../core/file/fileTypes.js';

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
  processedFiles: ProcessedFile[];
  safeFilePaths: string[];
}

export interface McpToolContext {
  directory?: string;
  repository?: string;
}

// Base interface for all MCP tool responses
interface BaseMcpToolResponse {
  description?: string;
  errorMessage?: string;
}

// Structured content for MCP tool responses with proper typing
type McpToolStructuredContent = (BaseMcpToolResponse & Record<string, unknown>) | undefined;

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
export const formatPackToolResponse = async (
  context: McpToolContext,
  metrics: McpToolMetrics,
  outputFilePath: string,
  topFilesLen = 5,
): Promise<CallToolResult> => {
  // Generate output ID and register the file
  const outputId = generateOutputId();
  registerOutputFile(outputId, outputFilePath);

  // Calculate total lines from the output file
  const outputContent = await fs.readFile(outputFilePath, 'utf8');
  const totalLines = outputContent.split('\n').length;

  // Get top files by character count
  const topFiles = Object.entries(metrics.fileCharCounts)
    .map(([filePath, charCount]) => ({
      path: filePath,
      charCount,
      tokenCount: metrics.fileTokenCounts[filePath] || 0,
    }))
    .sort((a, b) => b.charCount - a.charCount)
    .slice(0, topFilesLen);

  // Directory Structure
  const directoryStructure = generateTreeString(metrics.safeFilePaths, []);

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
        totalLines,
        topFiles,
      },
    },
    null,
    2,
  );

  return buildMcpToolSuccessResponse({
    description: `
🎉 Successfully packed codebase!\nPlease review the metrics below and consider adjusting compress/includePatterns/ignorePatterns if the token count is too high and you need to reduce it before reading the file content.

For environments with direct file system access, you can read the file directly using path: ${outputFilePath}
For environments without direct file access (e.g., web browsers or sandboxed apps), use the \`read_repomix_output\` tool with this outputId: ${outputId} to access the packed codebase contents.

The output retrieved with \`read_repomix_output\` has the following structure:

\`\`\`xml
This file is a merged representation of the entire codebase, combining all repository files into a single document.

<file_summary>
  (Metadata and usage AI instructions)
</file_summary>

<directory_structure>
src/
cli/
cliOutput.ts
index.ts

(...remaining directories)
</directory_structure>

<files>
<file path="src/index.js">
  // File contents here
</file>

(...remaining files)
</files>

<instruction>
(Custom instructions from output.instructionFilePath)
</instruction>
\`\`\`

You can use grep with \`path="<file-path>"\` to locate specific files within the output.
`,
    result: jsonResult,
    directoryStructure: directoryStructure,
    outputId: outputId,
    outputFilePath: outputFilePath,
    totalFiles: metrics.totalFiles,
    totalTokens: metrics.totalTokens,
  });
};

export const convertErrorToJson = (
  error: unknown,
): {
  errorMessage: string;
  details: {
    stack?: string;
    name: string;
    cause?: unknown;
    code?: string | number;
    timestamp: string;
    type: 'Error' | 'Unknown';
  };
} => {
  const timestamp = new Date().toISOString();

  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      details: {
        stack: error.stack,
        name: error.name,
        cause: error.cause,
        code:
          'code' in error
            ? (error.code as string | number)
            : 'errno' in error
              ? (error.errno as string | number)
              : undefined,
        timestamp,
        type: 'Error',
      },
    };
  }

  return {
    errorMessage: String(error),
    details: {
      name: 'UnknownError',
      timestamp,
      type: 'Unknown',
    },
  };
};

/**
 * Creates a successful MCP tool response with type safety
 * @param structuredContent - Object containing both machine-readable data and human-readable description
 * @returns CallToolResult with both text and structured content
 */
export const buildMcpToolSuccessResponse = (structuredContent: McpToolStructuredContent): CallToolResult => {
  const textContent = structuredContent !== undefined ? JSON.stringify(structuredContent, null, 2) : 'null';

  return {
    content: [
      {
        type: 'text',
        text: textContent,
      },
    ],
    structuredContent: structuredContent,
  };
};

/**
 * Creates an error MCP tool response with type safety
 * @param structuredContent - Object containing error message and details
 * @returns CallToolResult with error flag, text content, and structured content
 */
export const buildMcpToolErrorResponse = (structuredContent: McpToolStructuredContent): CallToolResult => {
  const textContent = structuredContent !== undefined ? JSON.stringify(structuredContent, null, 2) : 'null';

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: textContent,
      },
    ],
    // structuredContent is intentionally omitted for error responses
    // Error messages have different schema than success responses and may cause validation issues
  };
};
