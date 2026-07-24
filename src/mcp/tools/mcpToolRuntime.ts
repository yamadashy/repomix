import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { generateTreeString } from '../../core/file/fileTreeGenerate.js';
import type { ProcessedFile } from '../../core/file/fileTypes.js';
import { getRepomixTmpDir } from '../../shared/tmpDir.js';
import { PathScopeError, resolveWithinRoot, toVirtualPath } from '../pathScope.js';

/**
 * Resolve a file-system tool's path argument for both modes (shared by the read
 * file/directory tools). Sandbox: confine `input` to the workspace root — throws
 * PathScopeError on escape — and virtualize it for display. Non-sandbox: the legacy
 * absolute-path contract, where the caller's path is used and echoed as-is (the
 * absolute-path requirement stays a guard clause in the tool).
 */
export const resolveToolPath = async (
  config: { sandboxed: boolean; root: string },
  input: string,
): Promise<{ absPath: string; displayPath: string }> => {
  if (!config.sandboxed) return { absPath: input, displayPath: input };
  const absPath = await resolveWithinRoot(config.root, input);
  return { absPath, displayPath: toVirtualPath(config.root, absPath) };
};

/**
 * Map any caught error to a SAFE, path-free reason for the untrusted agent. This is
 * the whitelist that makes sandbox errors leak-proof by construction: we NEVER
 * forward error.message (it can embed the workspace root, the repomix install/worker
 * path, the node runtime, or the operator's home dir). A PathScopeError is the one
 * exception — its message is built from the agent's own input + the path rule, so it
 * is safe and useful. Everything else collapses to a fixed reason derived only from
 * the error CODE (an enum, never a string): an fs code maps to a specific reason, and
 * anything without a recognised code (RepomixError, worker/WASM load failure, …) maps
 * to a generic reason. The full error still reaches the operator via logger.error
 * (stderr) — the tool catches log it before calling this.
 */
export const sandboxErrorReason = (error: unknown): string => {
  if (error instanceof PathScopeError) return error.message;
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  switch (code) {
    case 'ENOENT':
      return 'not found';
    case 'EACCES':
    case 'EPERM':
      return 'permission denied';
    case 'EISDIR':
      return 'path is a directory';
    case 'ENOTDIR':
      return 'path is not a directory';
    case 'ELOOP':
      return 'too many symbolic links';
    case 'ENAMETOOLONG':
      return 'path name too long';
    case 'EMFILE':
    case 'ENFILE':
      return 'too many open files';
    default:
      return 'operation failed';
  }
};

/**
 * Shared MCP input schema for per-file inclusion levels (output.patterns).
 * Lets an agent build a packing scenario per call, mirroring the config-file
 * `output.patterns` option. Shape matches the `OutputPattern` config type so it
 * can be passed straight through to CliOptions.outputPatterns.
 */
export const outputPatternsSchema = z
  .array(
    z.object({
      pattern: z.string().min(1).describe('fast-glob pattern, matched the same way as includePatterns/ignorePatterns'),
      compress: z.boolean().optional().describe('Compress matching files via Tree-sitter instead of full content'),
      directoryStructureOnly: z
        .boolean()
        .optional()
        .describe('List matching files in the directory structure only, omitting their content'),
    }),
  )
  .optional()
  .describe(
    'Per-file inclusion levels. Patterns are evaluated in order and the first match wins; ' +
      'directoryStructureOnly takes precedence over compress, and a match with neither flag forces FULL content ' +
      '(use this to exempt specific files from a global compress). Files matching no pattern fall back to the ' +
      "global compress setting. Overrides any output.patterns from the target repository's repomix.config.json. " +
      'Example: set compress=true and outputPatterns=[{"pattern":"src/core/**"}] to keep src/core at full detail while compressing everything else.',
  );

interface OutputFileEntry {
  filePath: string;
  // Whether the file was registered from an untrusted path (attach_packed_output).
  // Such files must be secret-scanned each time their content is served, since the
  // file is outside Repomix's own packing pipeline and may change after attach.
  requiresSecretScan: boolean;
}

// Map to store generated output files
const outputFileRegistry = new Map<string, OutputFileEntry>();

// Register an output file
export const registerOutputFile = (id: string, filePath: string, requiresSecretScan = false): void => {
  outputFileRegistry.set(id, { filePath, requiresSecretScan });
};

// Get file path from output ID
export const getOutputFilePath = (id: string): string | undefined => {
  return outputFileRegistry.get(id)?.filePath;
};

// Whether the output file was registered from an untrusted attach path and must
// be secret-scanned before its content is served.
export const requiresSecretScan = (id: string): boolean => {
  return outputFileRegistry.get(id)?.requiresSecretScan ?? false;
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
    const tmpBaseDir = path.join(getRepomixTmpDir(), 'mcp-outputs');
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
  requiresSecretScan = false,
  scope?: { sandboxed: boolean; root: string },
): Promise<CallToolResult> => {
  const outputId = generateOutputId();
  registerOutputFile(outputId, outputFilePath, requiresSecretScan);

  const outputContent = await fs.readFile(outputFilePath, 'utf8');
  const totalLines = outputContent.split('\n').length;

  const topFiles = Object.entries(metrics.fileCharCounts)
    .map(([filePath, charCount]) => ({
      path: filePath,
      charCount,
      tokenCount: metrics.fileTokenCounts[filePath] || 0,
    }))
    .sort((a, b) => b.charCount - a.charCount)
    .slice(0, topFilesLen);

  const directoryStructure = generateTreeString(metrics.safeFilePaths, []);

  // In sandbox mode, never expose the host output path or the host directory.
  const outputFilePathDisplay = scope?.sandboxed ? '' : outputFilePath;
  const directoryDisplay =
    context.directory !== undefined && scope?.sandboxed
      ? toVirtualPath(scope.root, context.directory)
      : context.directory;

  const jsonResult = JSON.stringify(
    {
      ...(directoryDisplay ? { directory: directoryDisplay } : {}),
      ...(context.repository ? { repository: context.repository } : {}),
      outputFilePath: outputFilePathDisplay,
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

  // Only the "read the file directly using path" line exposes the host output
  // path, so it is the sole part omitted in sandbox mode; everything else
  // (including the path-free XML structure sample) is byte-for-byte identical to
  // the non-sandboxed output.
  const directAccessLine = scope?.sandboxed
    ? ''
    : `For environments with direct file system access, you can read the file directly using path: ${outputFilePath}\n`;

  return buildMcpToolSuccessResponse({
    description: `
🎉 Successfully packed codebase!\nPlease review the metrics below and consider adjusting compress/includePatterns/ignorePatterns if the token count is too high and you need to reduce it before reading the file content.

${directAccessLine}For environments without direct file access (e.g., web browsers or sandboxed apps), use the \`read_repomix_output\` tool with this outputId: ${outputId} to access the packed codebase contents.

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
    outputFilePath: outputFilePathDisplay,
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

/**
 * The single boundary for turning a caught error into a SANDBOX tool response. The
 * message is built ONLY from a whitelisted reason ({@link sandboxErrorReason}) plus
 * the agent's OWN input (`subject`, e.g. the relative path or outputId it supplied) —
 * error.message is never forwarded — so no host path can reach the agent by
 * construction. Note `subject` may legitimately be an absolute path the agent typed
 * (e.g. "/etc/passwd" it tried to read); echoing it back is safe and helps the agent
 * see what it sent, and it is NOT a host path. The no-host-path guarantee is enforced
 * structurally (never forwarding error.message) and asserted end-to-end by the sandbox
 * contract test. Non-sandbox callers never use this.
 */
export const buildSandboxErrorResponse = (error: unknown, subject?: string): CallToolResult => {
  const reason = sandboxErrorReason(error);
  const message = subject ? `Error: ${reason}: ${subject}` : `Error: ${reason}`;
  return buildMcpToolErrorResponse({ errorMessage: message });
};
