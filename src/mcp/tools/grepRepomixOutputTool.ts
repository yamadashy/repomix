import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import {
  buildMcpToolErrorResponse,
  buildMcpToolSuccessResponse,
  convertErrorToJson,
  getOutputFilePath,
} from './mcpToolRuntime.js';

const grepRepomixOutputInputSchema = z.object({
  outputId: z.string().describe('ID of the Repomix output file to search'),
  pattern: z.string().describe('Search pattern (JavaScript RegExp regular expression syntax)'),
  contextLines: z.coerce
    .number()
    .default(0)
    .describe(
      'Number of context lines to show before and after each match (default: 0). Overridden by beforeLines/afterLines if specified.',
    ),
  beforeLines: z.coerce
    .number()
    .optional()
    .describe('Number of context lines to show before each match (like grep -B). Takes precedence over contextLines.'),
  afterLines: z.coerce
    .number()
    .optional()
    .describe('Number of context lines to show after each match (like grep -A). Takes precedence over contextLines.'),
  ignoreCase: z.boolean().default(false).describe('Perform case-insensitive matching (default: false)'),
});

const grepRepomixOutputOutputSchema = z.object({
  description: z.string().describe('Human-readable description of the search results'),
  matches: z
    .array(
      z.object({
        lineNumber: z.number().describe('Line number where the match was found'),
        line: z.string().describe('The full line content'),
        matchedText: z.string().describe('The actual text that matched the pattern'),
      }),
    )
    .describe('Array of search matches found'),
  formattedOutput: z.array(z.string()).describe('Formatted grep-style output with context lines'),
  totalMatches: z.number().describe('Total number of matches found'),
  pattern: z.string().describe('The search pattern that was used'),
});

/**
 * Search options for grep functionality
 */
interface SearchOptions {
  pattern: string;
  contextLines: number;
  beforeLines: number;
  afterLines: number;
  ignoreCase: boolean;
}

/**
 * Search match result
 */
interface SearchMatch {
  lineNumber: number;
  line: string;
  matchedText: string;
}

/**
 * Search result containing matches and formatted output
 */
interface SearchResult {
  matches: SearchMatch[];
  formattedOutput: string[];
}

/**
 * Register the tool to search Repomix output files with grep-like functionality
 */
export const registerGrepRepomixOutputTool = (mcpServer: McpServer) => {
  mcpServer.registerTool(
    'grep_repomix_output',
    {
      title: 'Grep Repomix Output',
      description:
        'Search for patterns in a Repomix output file using grep-like functionality with JavaScript RegExp syntax. Returns matching lines with optional context lines around matches.',
      inputSchema: grepRepomixOutputInputSchema,
      outputSchema: grepRepomixOutputOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      outputId,
      pattern,
      contextLines = 0,
      beforeLines,
      afterLines,
      ignoreCase = false,
    }): Promise<CallToolResult> => {
      try {
        logger.trace(`Searching Repomix output with ID: ${outputId}, pattern: ${pattern}`);

        const filePath = getOutputFilePath(outputId);
        if (!filePath) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Output file with ID ${outputId} not found. The output file may have been deleted or the ID is invalid.`,
            details: {
              outputId,
              reason: 'FILE_NOT_FOUND',
            },
          });
        }

        try {
          await fs.access(filePath);
        } catch {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: Output file does not exist at path: ${filePath}. The temporary file may have been cleaned up.`,
            details: {
              outputId,
              reason: 'FILE_ACCESS_ERROR',
            },
          });
        }

        const content = await fs.readFile(filePath, 'utf8');

        // Determine before and after lines
        const finalBeforeLines = beforeLines !== undefined ? beforeLines : contextLines;
        const finalAfterLines = afterLines !== undefined ? afterLines : contextLines;

        // Perform grep search using separated functions
        let searchResult: SearchResult;
        try {
          searchResult = performGrepSearch(content, {
            pattern,
            contextLines,
            beforeLines: finalBeforeLines,
            afterLines: finalAfterLines,
            ignoreCase,
          });
        } catch (error) {
          return buildMcpToolErrorResponse({
            errorMessage: `Error: ${error instanceof Error ? error.message : String(error)}`,
            details: {
              outputId,
              pattern,
              reason: 'SEARCH_ERROR',
            },
          });
        }

        if (searchResult.matches.length === 0) {
          return buildMcpToolSuccessResponse({
            description: `No matches found for pattern "${pattern}" in Repomix output file (ID: ${outputId}).`,
            matches: [],
            formattedOutput: [],
            totalMatches: 0,
            pattern,
          } satisfies z.infer<typeof grepRepomixOutputOutputSchema>);
        }

        return buildMcpToolSuccessResponse({
          description: `Found ${searchResult.matches.length} match(es) for pattern "${pattern}" in Repomix output file (ID: ${outputId}):`,
          matches: searchResult.matches,
          formattedOutput: searchResult.formattedOutput,
          totalMatches: searchResult.matches.length,
          pattern,
        } satisfies z.infer<typeof grepRepomixOutputOutputSchema>);
      } catch (error) {
        logger.error(`Error in grep_repomix_output: ${error}`);
        return buildMcpToolErrorResponse(convertErrorToJson(error));
      }
    },
  );
};

/**
 * Create and validate a regular expression pattern
 */
export const createRegexPattern = (
  pattern: string,
  ignoreCase: boolean,
  deps = {
    RegExp,
  },
): RegExp => {
  const regexFlags = ignoreCase ? 'gi' : 'g';
  try {
    return new deps.RegExp(pattern, regexFlags);
  } catch (error) {
    throw new Error(
      `Invalid regular expression pattern: ${pattern}. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Search for pattern matches in file content
 */
export const searchInContent = (
  content: string,
  options: SearchOptions,
  deps = {
    createRegexPattern,
  },
): SearchMatch[] => {
  const lines = content.split('\n');
  const regex = deps.createRegexPattern(options.pattern, options.ignoreCase);

  const matches: SearchMatch[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(regex);
    if (match) {
      matches.push({
        lineNumber: i + 1,
        line,
        matchedText: match[0],
      });
    }
  }

  return matches;
};

/**
 * Format search results with separate before and after context lines
 */
export const formatSearchResults = (
  lines: string[],
  matches: SearchMatch[],
  beforeLines: number,
  afterLines: number,
): string[] => {
  if (matches.length === 0) {
    return [];
  }

  const resultLines: string[] = [];
  const addedLines = new Set<number>();

  for (const match of matches) {
    const start = Math.max(0, match.lineNumber - 1 - beforeLines);
    const end = Math.min(lines.length - 1, match.lineNumber - 1 + afterLines);

    // Add separator if there's a gap between previous and current context
    if (resultLines.length > 0 && start > Math.min(...addedLines) + 1) {
      resultLines.push('--');
    }

    for (let i = start; i <= end; i++) {
      if (!addedLines.has(i)) {
        const lineNum = i + 1;
        const prefix = i === match.lineNumber - 1 ? `${lineNum}:` : `${lineNum}-`;
        resultLines.push(`${prefix}${lines[i]}`);
        addedLines.add(i);
      }
    }
  }

  return resultLines;
};

/**
 * Perform grep-like search on content
 */
export const performGrepSearch = (
  content: string,
  options: SearchOptions,
  deps = {
    searchInContent,
    formatSearchResults,
  },
): SearchResult => {
  const matches = deps.searchInContent(content, options);
  const lines = content.split('\n');
  const formattedOutput = deps.formatSearchResults(lines, matches, options.beforeLines, options.afterLines);

  return {
    matches,
    formattedOutput,
  };
};
