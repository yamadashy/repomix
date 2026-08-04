import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { braceExpand } from 'minimatch';
import { z } from 'zod';
import { runCli } from '../../cli/cliRun.js';
import type { CliOptions } from '../../cli/types.js';
import { defaultFilePathMap } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import { splitPatterns } from '../../shared/patternUtils.js';
import type { McpServerConfig } from '../mcpServer.js';
import { isEscapingPath, resolveWithinRoot } from '../pathScope.js';
import {
  buildMcpToolErrorResponse,
  buildSandboxErrorResponse,
  convertErrorToJson,
  createToolWorkspace,
  formatPackToolResponse,
  outputPatternsSchema,
} from './mcpToolRuntime.js';

/**
 * True when a comma-separated include/ignore glob string contains any pattern that
 * escapes the workspace root. Tokenize with splitPatterns (brace-aware, exactly as
 * the packer does) and brace-expand each token before checking, because a brace
 * alternative can smuggle an absolute or ".." path — "{/etc/**,x}" expands to
 * "/etc/**", and fast-glob honors an absolute pattern regardless of cwd. A leading
 * "!" (negation) is stripped before the check.
 *
 * This is an early, human-readable rejection, not the security boundary: syntaxes it
 * cannot statically pre-expand (e.g. extglob) are still caught downstream by the
 * syntax-agnostic confineToBaseDir backstop in searchFiles, which drops any match
 * resolving outside the root.
 */
const patternsEscapeRoot = (patterns?: string): boolean =>
  splitPatterns(patterns).some((token) =>
    braceExpand(token).some((expanded) => isEscapingPath(expanded.trim().replace(/^!+/, ''))),
  );

const packCodebaseInputSchema = z.object({
  directory: z.string(),
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
  outputPatterns: outputPatternsSchema,
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

export const registerPackCodebaseTool = (
  mcpServer: McpServer,
  config: McpServerConfig = { sandboxed: false, root: process.cwd() },
) => {
  const inputSchema = packCodebaseInputSchema.extend({
    directory: z
      .string()
      .describe(
        config.sandboxed
          ? 'Directory to pack, relative to the workspace root (e.g. "." or "src").'
          : 'Directory to pack (Absolute path). Any directory readable by this process can be packed.',
      ),
  });

  mcpServer.registerTool(
    'pack_codebase',
    {
      title: 'Pack Local Codebase',
      description:
        'Package a local code directory into a consolidated file for AI analysis. This tool analyzes the codebase structure, extracts relevant code content, and generates a comprehensive report including metrics, file tree, and formatted code content. Supports multiple output formats: XML (structured with <file> tags), Markdown (human-readable with ## headers and code blocks), JSON (machine-readable with files as key-value pairs), and Plain text (simple format with separators). Also supports Tree-sitter compression for efficient token usage.',
      inputSchema,
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
      outputPatterns,
      topFilesLength,
      style,
    }): Promise<CallToolResult> => {
      let tempDir = '';

      try {
        let targetDirectory = directory;
        if (config.sandboxed) {
          // Confine include/ignore globs to the workspace (see patternsEscapeRoot:
          // brace-aware tokenization + brace expansion, so "{/etc/**,x}" can't slip an
          // absolute alternative past the check).
          for (const patterns of [includePatterns, ignorePatterns]) {
            if (patternsEscapeRoot(patterns)) {
              return buildMcpToolErrorResponse({
                errorMessage:
                  'Error: include/ignore patterns must be relative to the workspace root in sandbox mode (no absolute, "~", drive, UNC, or ".." patterns).',
              });
            }
          }
          targetDirectory = await resolveWithinRoot(config.root, directory);
          // Pre-check existence here so a mistyped directory gets an actionable
          // reason: otherwise searchFiles throws a code-less RepomixError ("Target
          // path does not exist"), which the sandbox error boundary can only render
          // as the generic "operation failed". Mirrors the file_system_* tools.
          try {
            if (!(await fs.stat(targetDirectory)).isDirectory()) {
              return buildMcpToolErrorResponse({ errorMessage: `Error: not a directory: ${directory}` });
            }
          } catch {
            return buildMcpToolErrorResponse({ errorMessage: `Error: directory not found: ${directory}` });
          }
        }

        tempDir = await createToolWorkspace();
        const outputFileName = defaultFilePathMap[style as keyof typeof defaultFilePathMap];
        const outputFilePath = path.join(tempDir, outputFileName);

        const cliOptions = {
          compress,
          include: includePatterns,
          ignore: ignorePatterns,
          outputPatterns,
          output: outputFilePath,
          style,
          securityCheck: true,
          topFilesLen: topFilesLength,
          quiet: true,
          // Untrusted-workspace lockdown — one set, all gated on --sandbox:
          //  - skip EVERY config file: the workspace's repomix.config.* AND the
          //    operator's global one, since either could set
          //    output.instructionFilePath to read an out-of-workspace file into the
          //    agent-visible output, or input.processors to run commands;
          //  - confine the file search to the root, a syntax-agnostic backstop behind
          //    the include/ignore pattern guard;
          //  - disable git-based sort: sortByChanges (on by default) runs
          //    `git -C <workspace> log`, which reads the untrusted workspace's
          //    .git/config (e.g. gpg.program via log.showSignature) — a host
          //    command-execution vector.
          ...(config.sandboxed
            ? { skipLocalConfig: true, skipGlobalConfig: true, confineToBaseDir: true, gitSortByChanges: false }
            : {}),
        } as CliOptions;

        // cliOptions.quiet makes runCli set the SHARED logger to SILENT and never
        // restore it — which would permanently blind the operator's stderr error
        // logging for the rest of the MCP session. Save + restore around the call.
        const logLevelBeforePack = logger.getLogLevel();
        let result: Awaited<ReturnType<typeof runCli>>;
        try {
          result = await runCli(['.'], targetDirectory, cliOptions);
        } finally {
          logger.setLogLevel(logLevelBeforePack);
        }
        if (!result) {
          return buildMcpToolErrorResponse({
            errorMessage: 'Failed to return a result',
          });
        }

        // Extract metrics information from the pack result
        const { packResult } = result;

        return await formatPackToolResponse(
          { directory: targetDirectory },
          packResult,
          outputFilePath,
          topFilesLength,
          false,
          {
            sandboxed: config.sandboxed,
            root: config.root,
          },
        );
      } catch (error) {
        // Sandbox: a whitelisted, path-free reason built from the error code + the
        // agent's own `directory` input — error.message is never forwarded, so no
        // host path can leak. Non-sandbox: full detail (host paths are fine locally).
        if (config.sandboxed) return buildSandboxErrorResponse(error, directory);
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};
