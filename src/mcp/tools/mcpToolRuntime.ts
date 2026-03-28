import crypto from 'node:crypto';
import { statSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { generateTreeString } from '../../core/file/fileTreeGenerate.js';

// ── Tree string cache ─────────────────────────────────────────────────────
// Caches the directory structure tree string for the MCP response.
// On repeated pack() calls with unchanged file lists, generateTreeString (~11ms)
// is skipped. Keyed by the total file count + first/last file paths as a fast
// change-detection heuristic. In the rare case of a false positive (same count
// and same first/last paths but different interior), the cached tree is still
// a valid directory tree — just potentially stale until the next actual change.
let _treeCache: { key: string; tree: string } | undefined;

const buildTreeCacheKey = (filePaths: string[]): string => {
  const len = filePaths.length;
  if (len === 0) return '0::';
  return `${len}:${filePaths[0]}:${filePaths[len - 1]}`;
};

// Map to store generated output files. Bounded to prevent unbounded memory growth
// in long-running MCP sessions where pack_codebase is called repeatedly.
// Each entry is ~100 bytes (16-char hex ID + absolute file path), so 1000 entries ≈ 100KB.
const MAX_REGISTRY_SIZE = 1000;
const outputFileRegistry = new Map<string, string>();

// Register an output file. Evicts the oldest entry when the registry is full.
// Also invalidates any cached content for the old entry being evicted.
export const registerOutputFile = (id: string, filePath: string): void => {
  if (outputFileRegistry.size >= MAX_REGISTRY_SIZE) {
    // Map iterates in insertion order; delete the first (oldest) entry
    const oldestKey = outputFileRegistry.keys().next().value;
    if (oldestKey !== undefined) {
      outputFileRegistry.delete(oldestKey);
      outputContentCache.delete(oldestKey);
    }
  }
  outputFileRegistry.set(id, filePath);
};

// Get file path from output ID
export const getOutputFilePath = (id: string): string | undefined => {
  return outputFileRegistry.get(id);
};

// ── Output content cache ──────────────────────────────────────────────────
// Caches file content for MCP read/grep tools. In typical MCP sessions,
// grep_repomix_output and read_repomix_output are called 5-10+ times on
// the same output. Each call previously re-read the multi-MB file from disk
// (~5-10ms) and for grep, re-split it into 200K+ lines (~10ms, ~10MB alloc).
// This cache validates via mtime+size (statSync) and stores both the raw
// content and lazily-computed split lines.
//
// Memory budget: 50MB max content. Evicts oldest entries when exceeded.
// Output files are immutable (written once by pack()), so mtime+size validation
// is a fast no-op in practice — it's there as a safety net for manual edits.
interface CachedOutputEntry {
  content: string;
  mtimeMs: number;
  size: number;
  totalLines: number;
  lines: string[] | undefined; // lazily populated on first grep
  contentBytes: number;
}

const outputContentCache = new Map<string, CachedOutputEntry>();
let outputCacheTotalBytes = 0;
const MAX_OUTPUT_CACHE_BYTES = 50 * 1024 * 1024;

/**
 * Get cached output content for an MCP output ID. Reads from disk on cache miss
 * or when the file has changed (mtime/size mismatch). Returns null if the file
 * doesn't exist or the ID is not registered.
 */
export const getOutputContent = async (outputId: string): Promise<{ content: string; totalLines: number } | null> => {
  const filePath = getOutputFilePath(outputId);
  if (!filePath) return null;

  const cached = outputContentCache.get(outputId);
  if (cached) {
    // Validate via statSync — output files are in tmpdir and recently written,
    // so the stat data is always in the kernel buffer cache (~0.01ms).
    try {
      const stat = statSync(filePath);
      if (stat.mtimeMs === cached.mtimeMs && stat.size === cached.size) {
        return { content: cached.content, totalLines: cached.totalLines };
      }
    } catch {
      // File was deleted — remove stale cache entry
      outputCacheTotalBytes -= cached.contentBytes;
      outputContentCache.delete(outputId);
      return null;
    }
    // File changed — remove stale entry before re-reading
    outputCacheTotalBytes -= cached.contentBytes;
    outputContentCache.delete(outputId);
  }

  // Cache miss — read from disk
  let content: string;
  let stat: { mtimeMs: number; size: number };
  try {
    content = await fs.readFile(filePath, 'utf8');
    stat = statSync(filePath);
  } catch {
    return null;
  }

  // Count lines using indexOf loop — O(1) allocation
  let totalLines = 1;
  let pos = content.indexOf('\n');
  while (pos !== -1) {
    totalLines++;
    pos = content.indexOf('\n', pos + 1);
  }

  const contentBytes = Buffer.byteLength(content, 'utf8');

  // Evict oldest entries if over budget
  if (outputCacheTotalBytes + contentBytes > MAX_OUTPUT_CACHE_BYTES) {
    for (const [oldId, oldEntry] of outputContentCache) {
      outputCacheTotalBytes -= oldEntry.contentBytes;
      outputContentCache.delete(oldId);
      if (outputCacheTotalBytes + contentBytes <= MAX_OUTPUT_CACHE_BYTES) break;
    }
  }

  const entry: CachedOutputEntry = {
    content,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    totalLines,
    lines: undefined,
    contentBytes,
  };
  outputContentCache.set(outputId, entry);
  outputCacheTotalBytes += contentBytes;

  return { content, totalLines };
};

/**
 * Get cached split lines for an MCP output ID (for grep).
 * Lazily computes and caches the split lines on first access.
 * Returns null if content is not cached.
 */
export const getOutputLines = async (
  outputId: string,
): Promise<{ lines: string[]; content: string; totalLines: number } | null> => {
  // Ensure content is cached first
  const result = await getOutputContent(outputId);
  if (!result) return null;

  const entry = outputContentCache.get(outputId);
  if (!entry) return null;

  if (!entry.lines) {
    entry.lines = entry.content.split('\n');
  }

  return { lines: entry.lines, content: entry.content, totalLines: entry.totalLines };
};

export interface McpToolMetrics {
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  fileCharCounts: Record<string, number>;
  fileTokenCounts: Record<string, number>;
  outputLineCount: number;
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

  // Use pre-computed line count from pack() — avoids reading the multi-MB output
  // file back from disk and splitting it into an array just to count lines.
  const totalLines = metrics.outputLineCount;

  // Get top files by character count
  const topFiles = Object.entries(metrics.fileCharCounts)
    .map(([filePath, charCount]) => ({
      path: filePath,
      charCount,
      tokenCount: metrics.fileTokenCounts[filePath] || 0,
    }))
    .sort((a, b) => b.charCount - a.charCount)
    .slice(0, topFilesLen);

  // Directory Structure — cache across repeated pack() calls to avoid ~11ms
  // tree regeneration when the file list hasn't changed (common in MCP sessions).
  const treeCacheKey = buildTreeCacheKey(metrics.safeFilePaths);
  let directoryStructure: string;
  if (_treeCache && _treeCache.key === treeCacheKey) {
    directoryStructure = _treeCache.tree;
  } else {
    directoryStructure = generateTreeString(metrics.safeFilePaths, []);
    _treeCache = { key: treeCacheKey, tree: directoryStructure };
  }

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
