import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRegexPattern,
  formatSearchResults,
  performGrepSearch,
  registerGrepRepomixOutputTool,
  searchInContent,
} from '../../../src/mcp/tools/grepRepomixOutputTool.js';
import * as mcpToolRuntime from '../../../src/mcp/tools/mcpToolRuntime.js';

vi.mock('node:fs/promises');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js');
vi.mock('../../../src/shared/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    error: vi.fn(),
  },
}));

describe('grepRepomixOutputTool', () => {
  describe('createRegexPattern', () => {
    it('should create a case-sensitive regex by default', () => {
      const regex = createRegexPattern('test', false);
      expect(regex.flags).toBe('g');
      expect(regex.source).toBe('test');
    });

    it('should create a case-insensitive regex when specified', () => {
      const regex = createRegexPattern('test', true);
      expect(regex.flags).toBe('gi');
      expect(regex.source).toBe('test');
    });

    it('should throw error for invalid regex patterns', () => {
      expect(() => createRegexPattern('[invalid', false)).toThrow('Invalid regular expression pattern');
    });

    it('should use dependency injection for RegExp', () => {
      const mockRegExp = vi.fn().mockReturnValue(/test/g) as unknown as RegExpConstructor;
      createRegexPattern('test', false, { RegExp: mockRegExp });
      expect(mockRegExp).toHaveBeenCalledWith('test', 'g');
    });
  });

  describe('searchInContent', () => {
    it('should find matches in content', () => {
      const content = 'line 1\npattern match\nline 3\nanother pattern\nline 5';
      const options = { pattern: 'pattern', contextLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: 'pattern match',
        matchedText: 'pattern',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: 'another pattern',
        matchedText: 'pattern',
      });
    });

    it('should handle case-insensitive search', () => {
      const content = 'Line 1\nPATTERN match\nline 3';
      const options = { pattern: 'pattern', contextLines: 0, ignoreCase: true };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: 'PATTERN match',
        matchedText: 'PATTERN',
      });
    });

    it('should return empty array when no matches found', () => {
      const content = 'line 1\nline 2\nline 3';
      const options = { pattern: 'notfound', contextLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(0);
    });

    it('should use dependency injection for regex creation', () => {
      const mockCreateRegexPattern = vi.fn().mockReturnValue(/test/g);
      const content = 'test content';
      const options = { pattern: 'test', contextLines: 0, ignoreCase: false };

      searchInContent(content, options, { createRegexPattern: mockCreateRegexPattern });

      expect(mockCreateRegexPattern).toHaveBeenCalledWith('test', false);
    });
  });

  describe('formatSearchResults', () => {
    const lines = ['line 1', 'pattern match', 'line 3', 'another pattern', 'line 5'];
    const matches = [
      { lineNumber: 2, line: 'pattern match', matchedText: 'pattern' },
      { lineNumber: 4, line: 'another pattern', matchedText: 'pattern' },
    ];

    it('should format results without context lines', () => {
      const result = formatSearchResults(lines, matches, 0);

      expect(result).toEqual(['2:pattern match', '--', '4:another pattern']);
    });

    it('should format results with context lines', () => {
      const result = formatSearchResults(lines, matches, 1);

      expect(result).toEqual(['1-line 1', '2:pattern match', '3-line 3', '--', '4:another pattern', '5-line 5']);
    });

    it('should return empty array for no matches', () => {
      const result = formatSearchResults(lines, [], 0);
      expect(result).toEqual([]);
    });

    it('should handle overlapping context correctly', () => {
      const closeMatches = [
        { lineNumber: 2, line: 'pattern match', matchedText: 'pattern' },
        { lineNumber: 3, line: 'line 3', matchedText: 'line' },
      ];

      const result = formatSearchResults(lines, closeMatches, 1);

      // Should not duplicate lines and should merge overlapping contexts
      expect(result).toEqual(['1-line 1', '2:pattern match', '3-line 3', '4-another pattern']);
    });
  });

  describe('performGrepSearch', () => {
    it('should perform complete grep search and return formatted results', () => {
      const content = 'line 1\npattern match\nline 3\nanother pattern\nline 5';
      const options = { pattern: 'pattern', contextLines: 1, ignoreCase: false };

      const result = performGrepSearch(content, options);

      expect(result.matches).toHaveLength(2);
      expect(result.formattedOutput).toContain('2:pattern match');
      expect(result.formattedOutput).toContain('4:another pattern');
      expect(result.formattedOutput).toContain('1-line 1');
      expect(result.formattedOutput).toContain('3-line 3');
    });

    it('should use dependency injection for search functions', () => {
      const mockSearchInContent = vi.fn().mockReturnValue([]);
      const mockFormatSearchResults = vi.fn().mockReturnValue(['formatted']);
      const content = 'test content';
      const options = { pattern: 'test', contextLines: 0, ignoreCase: false };

      const result = performGrepSearch(content, options, {
        searchInContent: mockSearchInContent,
        formatSearchResults: mockFormatSearchResults,
      });

      expect(mockSearchInContent).toHaveBeenCalledWith(content, options);
      expect(mockFormatSearchResults).toHaveBeenCalledWith(['test content'], [], 0);
      expect(result.formattedOutput).toEqual(['formatted']);
    });
  });

  describe('registerGrepRepomixOutputTool integration tests', () => {
    const mockMcpServer = {
      tool: vi.fn(),
    } as const;

    type ToolHandlerType = (args: {
      outputId: string;
      pattern: string;
      contextLines?: number;
      ignoreCase?: boolean;
    }) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text: string }>;
    }>;

    let toolHandler: ToolHandlerType;

    beforeEach(() => {
      vi.resetAllMocks();

      registerGrepRepomixOutputTool(mockMcpServer as unknown as McpServer);

      toolHandler = mockMcpServer.tool.mock.calls[0][4];
    });

    it('should register the tool with correct parameters', () => {
      expect(mockMcpServer.tool).toHaveBeenCalledWith(
        'grep_repomix_output',
        expect.any(String),
        expect.objectContaining({
          outputId: expect.any(Object),
          pattern: expect.any(Object),
          contextLines: expect.any(Object),
          ignoreCase: expect.any(Object),
        }),
        expect.objectContaining({
          title: 'Grep Repomix Output',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        }),
        expect.any(Function),
      );
    });

    it('should find matches and return them with line numbers', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(
        'line 1\npattern match\nline 3\nanother pattern\nline 5' as unknown as Buffer,
      );

      const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('Found 2 match(es)');
      expect(result.content[1].text).toContain('2:pattern match');
      expect(result.content[1].text).toContain('4:another pattern');
    });

    it('should handle context lines correctly', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('line 1\nline 2\npattern match\nline 4\nline 5' as unknown as Buffer);

      const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern', contextLines: 1 });

      expect(result.content[1].text).toContain('2-line 2');
      expect(result.content[1].text).toContain('3:pattern match');
      expect(result.content[1].text).toContain('4-line 4');
    });

    it('should handle case insensitive search', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('Line 1\nPATTERN match\nline 3' as unknown as Buffer);

      const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern', ignoreCase: true });

      expect(result.content[1].text).toContain('2:PATTERN match');
    });

    it('should return no matches message when pattern not found', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('line 1\nline 2\nline 3' as unknown as Buffer);

      const result = await toolHandler({ outputId: 'test-id', pattern: 'notfound' });

      expect(result.content[0].text).toContain('No matches found');
    });

    it('should handle invalid regex patterns', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('some content' as unknown as Buffer);

      const result = await toolHandler({ outputId: 'test-id', pattern: '[invalid' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid regular expression pattern');
    });

    it('should handle file not found error', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue(undefined);

      const result = await toolHandler({ outputId: 'test-id', pattern: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Output file with ID test-id not found');
    });

    it('should handle file access error', async () => {
      vi.mocked(mcpToolRuntime.getOutputFilePath).mockReturnValue('/path/to/file.xml');
      vi.mocked(fs.access).mockRejectedValue(new Error('File not accessible'));

      const result = await toolHandler({ outputId: 'test-id', pattern: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Output file does not exist');
    });
  });
});
