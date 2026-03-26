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

vi.mock('../../../src/shared/logger.js');
vi.mock('../../../src/mcp/tools/mcpToolRuntime.js', async () => {
  const actual = await vi.importActual('../../../src/mcp/tools/mcpToolRuntime.js');
  return {
    ...actual,
    getOutputLines: vi.fn(),
  };
});

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
      // Create a mock that works as a constructor using regular function syntax
      const mockRegExp = vi.fn().mockImplementation(function (this: unknown, pattern: string, flags: string) {
        return new RegExp(pattern, flags);
      });
      createRegexPattern('test', false, { RegExp: mockRegExp as unknown as RegExpConstructor });
      expect(mockRegExp).toHaveBeenCalledWith('test', 'g');
    });
  });

  describe('searchInContent', () => {
    it('should find matches in content', () => {
      const content = 'line 1\npattern match\nline 3\nanother pattern\nline 5';
      const options = { pattern: 'pattern', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

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
      const options = { pattern: 'pattern', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: true };

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
      const options = { pattern: 'notfound', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(0);
    });

    it('should use dependency injection for regex creation', () => {
      const mockCreateRegexPattern = vi.fn().mockReturnValue(/test/g);
      const content = 'test content';
      const options = { pattern: 'test', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      searchInContent(content, options, { createRegexPattern: mockCreateRegexPattern });

      expect(mockCreateRegexPattern).toHaveBeenCalledWith('test', false);
    });

    it('should handle Japanese text search', () => {
      const content = '最初の行\n日本語のパターン検索\n3行目\n別の日本語パターン\n最後の行';
      const options = { pattern: '日本語', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: '日本語のパターン検索',
        matchedText: '日本語',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: '別の日本語パターン',
        matchedText: '日本語',
      });
    });

    it('should handle Chinese text search', () => {
      const content = '第一行\n中文搜索模式\n第三行\n另一个中文模式\n最后一行';
      const options = { pattern: '中文', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: '中文搜索模式',
        matchedText: '中文',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: '另一个中文模式',
        matchedText: '中文',
      });
    });

    it('should handle Korean text search', () => {
      const content = '첫 번째 줄\n한국어 패턴 검색\n세 번째 줄\n다른 한국어 패턴\n마지막 줄';
      const options = { pattern: '한국어', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: '한국어 패턴 검색',
        matchedText: '한국어',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: '다른 한국어 패턴',
        matchedText: '한국어',
      });
    });

    it('should handle emoji search', () => {
      const content = 'line 1\n🎉 celebration emoji\nline 3\nanother 🎉 here\nline 5';
      const options = { pattern: '🎉', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: '🎉 celebration emoji',
        matchedText: '🎉',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: 'another 🎉 here',
        matchedText: '🎉',
      });
    });

    it('should handle mixed multilingual content', () => {
      const content = 'English line\n日本語とEnglishの混在\n中文和English混合\n🚀 emoji with text\nNormal line';
      const options = { pattern: 'English', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(3);
      expect(matches[0]).toEqual({
        lineNumber: 1,
        line: 'English line',
        matchedText: 'English',
      });
      expect(matches[1]).toEqual({
        lineNumber: 2,
        line: '日本語とEnglishの混在',
        matchedText: 'English',
      });
      expect(matches[2]).toEqual({
        lineNumber: 3,
        line: '中文和English混合',
        matchedText: 'English',
      });
    });

    it('should handle special characters and symbols', () => {
      const content = 'line 1\n$special #symbols @test\nline 3\n&more $special chars\nline 5';
      const options = { pattern: '\\$special', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: '$special #symbols @test',
        matchedText: '$special',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: '&more $special chars',
        matchedText: '$special',
      });
    });

    it('should handle regex patterns with Unicode', () => {
      const content = 'file1.js\nファイル1.ts\nfile2.py\nファイル2.jsx\ntest.md';
      const options = {
        pattern: 'ファイル\\d+\\.(ts|jsx)',
        contextLines: 0,
        beforeLines: 0,
        afterLines: 0,
        ignoreCase: false,
      };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: 'ファイル1.ts',
        matchedText: 'ファイル1.ts',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: 'ファイル2.jsx',
        matchedText: 'ファイル2.jsx',
      });
    });

    it('should handle case-insensitive search with multibyte characters', () => {
      const content = '日本語テスト\nNIPPON語test\n中文测试\nTEST中文';
      const options = { pattern: 'test', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: true };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        lineNumber: 2,
        line: 'NIPPON語test',
        matchedText: 'test',
      });
      expect(matches[1]).toEqual({
        lineNumber: 4,
        line: 'TEST中文',
        matchedText: 'TEST',
      });
    });

    it('should handle complex Unicode regex patterns', () => {
      const content = 'user@example.com\nユーザー@例.jp\ntest@テスト.org\n管理者@サンプル.co.jp\nnormal text';
      const options = {
        pattern: '.+@.+\\.(com|jp|org)',
        contextLines: 0,
        beforeLines: 0,
        afterLines: 0,
        ignoreCase: false,
      };

      const matches = searchInContent(content, options);

      expect(matches).toHaveLength(4);
      expect(matches[0].line).toBe('user@example.com');
      expect(matches[1].line).toBe('ユーザー@例.jp');
      expect(matches[2].line).toBe('test@テスト.org');
      expect(matches[3].line).toBe('管理者@サンプル.co.jp');
    });
  });

  describe('formatSearchResults', () => {
    const lines = ['line 1', 'pattern match', 'line 3', 'another pattern', 'line 5'];
    const matches = [
      { lineNumber: 2, line: 'pattern match', matchedText: 'pattern' },
      { lineNumber: 4, line: 'another pattern', matchedText: 'pattern' },
    ];

    it('should format results without context lines', () => {
      const result = formatSearchResults(lines, matches, 0, 0);

      expect(result).toEqual(['2:pattern match', '--', '4:another pattern']);
    });

    it('should format results with equal before and after context lines', () => {
      const result = formatSearchResults(lines, matches, 1, 1);

      // No separator: match 1 context (lines 0-2) and match 2 context (lines 2-4) are contiguous
      expect(result).toEqual(['1-line 1', '2:pattern match', '3-line 3', '4:another pattern', '5-line 5']);
    });

    it('should format results with different before and after context lines', () => {
      const result = formatSearchResults(lines, matches, 1, 0);

      // No separator: match 1 ends at line 1, match 2 starts at line 2 (contiguous)
      expect(result).toEqual(['1-line 1', '2:pattern match', '3-line 3', '4:another pattern']);
    });

    it('should format results with only after context lines', () => {
      const result = formatSearchResults(lines, matches, 0, 1);

      // No separator: match 1 context (lines 1-2) and match 2 context (lines 3-4) are contiguous
      expect(result).toEqual(['2:pattern match', '3-line 3', '4:another pattern', '5-line 5']);
    });

    it('should format results with more before than after context lines', () => {
      const extendedLines = ['line 0', 'line 1', 'pattern match', 'line 3', 'another pattern', 'line 5', 'line 6'];
      const extendedMatches = [
        { lineNumber: 3, line: 'pattern match', matchedText: 'pattern' },
        { lineNumber: 5, line: 'another pattern', matchedText: 'pattern' },
      ];

      const result = formatSearchResults(extendedLines, extendedMatches, 2, 1);

      // No separator: match 1 context (lines 0-3) overlaps with match 2 context (lines 2-5)
      expect(result).toEqual(['1-line 0', '2-line 1', '3:pattern match', '4-line 3', '5:another pattern', '6-line 5']);
    });

    it('should return empty array for no matches', () => {
      const result = formatSearchResults(lines, [], 0, 0);
      expect(result).toEqual([]);
    });

    it('should handle overlapping context correctly', () => {
      const closeMatches = [
        { lineNumber: 2, line: 'pattern match', matchedText: 'pattern' },
        { lineNumber: 3, line: 'line 3', matchedText: 'line' },
      ];

      const result = formatSearchResults(lines, closeMatches, 1, 1);

      // Should not duplicate lines and should merge overlapping contexts
      expect(result).toEqual(['1-line 1', '2:pattern match', '3-line 3', '4-another pattern']);
    });
  });

  describe('performGrepSearch', () => {
    it('should perform complete grep search and return formatted results', () => {
      const content = 'line 1\npattern match\nline 3\nanother pattern\nline 5';
      const options = { pattern: 'pattern', contextLines: 1, beforeLines: 1, afterLines: 1, ignoreCase: false };

      const result = performGrepSearch(content, options);

      expect(result.matches).toHaveLength(2);
      expect(result.formattedOutput).toContain('2:pattern match');
      expect(result.formattedOutput).toContain('4:another pattern');
      expect(result.formattedOutput).toContain('1-line 1');
      expect(result.formattedOutput).toContain('3-line 3');
    });

    it('should use dependency injection for search functions', () => {
      const mockSearchInLines = vi.fn().mockReturnValue([]);
      const mockFormatSearchResults = vi.fn().mockReturnValue(['formatted']);
      const content = 'test content';
      const options = { pattern: 'test', contextLines: 0, beforeLines: 0, afterLines: 0, ignoreCase: false };

      const result = performGrepSearch(content, options, {
        searchInLines: mockSearchInLines,
        formatSearchResults: mockFormatSearchResults,
      });

      expect(mockSearchInLines).toHaveBeenCalledWith(['test content'], options);
      expect(mockFormatSearchResults).toHaveBeenCalledWith(['test content'], [], 0, 0);
      expect(result.formattedOutput).toEqual(['formatted']);
    });

    it('should handle different before and after context lines', () => {
      const content = 'line 1\nline 2\npattern match\nline 4\nline 5';
      const options = { pattern: 'pattern', contextLines: 0, beforeLines: 2, afterLines: 1, ignoreCase: false };

      const result = performGrepSearch(content, options);

      expect(result.matches).toHaveLength(1);
      expect(result.formattedOutput).toContain('1-line 1');
      expect(result.formattedOutput).toContain('2-line 2');
      expect(result.formattedOutput).toContain('3:pattern match');
      expect(result.formattedOutput).toContain('4-line 4');
      expect(result.formattedOutput).not.toContain('5-line 5');
    });
  });

  describe('registerGrepRepomixOutputTool integration tests', () => {
    const mockMcpServer = {
      registerTool: vi.fn(),
    } as const;

    type ToolHandlerType = (args: {
      outputId: string;
      pattern: string;
      contextLines?: number;
      beforeLines?: number;
      afterLines?: number;
      ignoreCase?: boolean;
    }) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text: string }>;
    }>;

    let toolHandler: ToolHandlerType;

    beforeEach(() => {
      vi.resetAllMocks();

      registerGrepRepomixOutputTool(mockMcpServer as unknown as McpServer);

      toolHandler = mockMcpServer.registerTool.mock.calls[0][2];
    });

    it('should register the tool with correct parameters', () => {
      expect(mockMcpServer.registerTool).toHaveBeenCalledWith(
        'grep_repomix_output',
        expect.any(Object), // tool spec
        expect.any(Function),
      );
    });

    // Helper to create a mock return for getOutputLines
    const mockOutputLines = (content: string) => {
      const lines = content.split('\n');
      vi.mocked(mcpToolRuntime.getOutputLines).mockResolvedValue({
        lines,
        content,
        totalLines: lines.length,
      });
    };

    it('should find matches and return them with line numbers', async () => {
      mockOutputLines('line 1\npattern match\nline 3\nanother pattern\nline 5');

      const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      expect(parsedResult.formattedOutput).toContain('2:pattern match');
      expect(parsedResult.formattedOutput).toContain('4:another pattern');
    });

    it('should handle separate before and after context lines', async () => {
      mockOutputLines('line 1\nline 2\npattern match\nline 4\nline 5\nline 6');

      const result = await toolHandler({
        outputId: 'test-id',
        pattern: 'pattern',
        beforeLines: 2,
        afterLines: 1,
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('1-line 1');
      expect(formattedOutputString).toContain('2-line 2');
      expect(formattedOutputString).toContain('3:pattern match');
      expect(formattedOutputString).toContain('4-line 4');
      expect(formattedOutputString).not.toContain('5-line 5');
    });

    it('should prioritize beforeLines and afterLines over contextLines', async () => {
      mockOutputLines('line 1\nline 2\npattern match\nline 4\nline 5');

      const result = await toolHandler({
        outputId: 'test-id',
        pattern: 'pattern',
        contextLines: 2,
        beforeLines: 1,
        afterLines: 0,
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('2-line 2');
      expect(formattedOutputString).toContain('3:pattern match');
      expect(formattedOutputString).not.toContain('1-line 1');
      expect(formattedOutputString).not.toContain('4-line 4');
    });

    it('should use contextLines when beforeLines and afterLines are not specified', async () => {
      mockOutputLines('line 1\nline 2\npattern match\nline 4\nline 5');

      const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern', contextLines: 1 });

      const parsedResult = JSON.parse(result.content[0].text);
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('2-line 2');
      expect(formattedOutputString).toContain('3:pattern match');
      expect(formattedOutputString).toContain('4-line 4');
    });

    it('should handle case insensitive search', async () => {
      mockOutputLines('Line 1\nPATTERN match\nline 3');

      const result = await toolHandler({ outputId: 'test-id', pattern: 'pattern', ignoreCase: true });

      const parsedResult = JSON.parse(result.content[0].text);
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('2:PATTERN match');
    });

    it('should return no matches message when pattern not found', async () => {
      mockOutputLines('line 1\nline 2\nline 3');

      const result = await toolHandler({ outputId: 'test-id', pattern: 'notfound' });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('No matches found');
    });

    it('should handle invalid regex patterns', async () => {
      mockOutputLines('some content');

      const result = await toolHandler({ outputId: 'test-id', pattern: '[invalid' });

      expect(result.isError).toBe(true);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.errorMessage).toContain('Invalid regular expression pattern');
    });

    it('should handle file not found error', async () => {
      vi.mocked(mcpToolRuntime.getOutputLines).mockResolvedValue(null);

      const result = await toolHandler({ outputId: 'test-id', pattern: 'test' });

      expect(result.isError).toBe(true);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.errorMessage).toContain('Output file with ID test-id not found');
    });

    it('should handle file access error', async () => {
      vi.mocked(mcpToolRuntime.getOutputLines).mockResolvedValue(null);

      const result = await toolHandler({ outputId: 'test-id', pattern: 'test' });

      expect(result.isError).toBe(true);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.errorMessage).toContain('Output file with ID test-id not found');
    });

    // Multilingual and Unicode content integration tests
    it('should handle Japanese text in file content', async () => {
      mockOutputLines('最初の行\n日本語のパターン\n3行目\n別の日本語\n最後の行');

      const result = await toolHandler({ outputId: 'test-id', pattern: '日本語' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      expect(parsedResult.formattedOutput).toContain('2:日本語のパターン');
      expect(parsedResult.formattedOutput).toContain('4:別の日本語');
    });

    it('should handle Chinese text in file content', async () => {
      mockOutputLines('第一行\n中文搜索\n第三行\n更多中文\n最后一行');

      const result = await toolHandler({ outputId: 'test-id', pattern: '中文' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      expect(parsedResult.formattedOutput).toContain('2:中文搜索');
      expect(parsedResult.formattedOutput).toContain('4:更多中文');
    });

    it('should handle Korean text in file content', async () => {
      mockOutputLines('첫 번째 줄\n한국어 검색\n세 번째 줄\n다른 한국어\n마지막 줄');

      const result = await toolHandler({ outputId: 'test-id', pattern: '한국어' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      expect(parsedResult.formattedOutput).toContain('2:한국어 검색');
      expect(parsedResult.formattedOutput).toContain('4:다른 한국어');
    });

    it('should handle emoji content in file', async () => {
      mockOutputLines('line 1\n🎉 celebration\nline 3\n🚀 rocket emoji\nline 5');

      const result = await toolHandler({ outputId: 'test-id', pattern: '🎉|🚀' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      expect(parsedResult.formattedOutput).toContain('2:🎉 celebration');
      expect(parsedResult.formattedOutput).toContain('4:🚀 rocket emoji');
    });

    it('should handle mixed multilingual content in file', async () => {
      mockOutputLines('English line\n日本語とEnglish混在\n中文和English混合\n🌟 mixed content\nनमस्ते English');

      const result = await toolHandler({ outputId: 'test-id', pattern: 'English', contextLines: 1 });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 4 match(es)');
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('1:English line');
      expect(formattedOutputString).toContain('2-日本語とEnglish混在');
      expect(formattedOutputString).toContain('3-中文和English混合');
      expect(formattedOutputString).toContain('5:नमस्ते English');
    });

    it('should handle complex Unicode regex patterns in file content', async () => {
      mockOutputLines('user@example.com\nユーザー@例.jp\ntest@テスト.org\n管理者@サンプル.co.jp\nnormal text');

      const result = await toolHandler({ outputId: 'test-id', pattern: '.+@.+\\.(com|jp|org)' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 4 match(es)');
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('1:user@example.com');
      expect(formattedOutputString).toContain('2:ユーザー@例.jp');
      expect(formattedOutputString).toContain('3:test@テスト.org');
      expect(formattedOutputString).toContain('4:管理者@サンプル.co.jp');
    });

    it('should handle special characters with escaping in file content', async () => {
      mockOutputLines('normal line\n$special chars #symbols\nline 3\n&more $special items\nend line');

      const result = await toolHandler({ outputId: 'test-id', pattern: '\\$special', contextLines: 1 });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('2:$special chars #symbols');
      expect(formattedOutputString).toContain('4:&more $special items');
    });

    it('should handle case-insensitive search with multibyte characters in file', async () => {
      mockOutputLines('日本語テスト\nNIPPON語test\n中文测试\nTEST中文\nnormal');

      const result = await toolHandler({ outputId: 'test-id', pattern: 'test', ignoreCase: true });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      const formattedOutputString = parsedResult.formattedOutput.join('\n');
      expect(formattedOutputString).toContain('2:NIPPON語test');
      expect(formattedOutputString).toContain('4:TEST中文');
    });

    it('should handle string parameters by coercing them to numbers', async () => {
      mockOutputLines('line 1\npattern match\nline 3\nanother pattern\nline 5');

      // Simulate Cursor AI sending strings instead of numbers
      const result = await toolHandler({
        outputId: 'test-id',
        pattern: 'pattern',
        contextLines: '1' as unknown as number,
        beforeLines: '2' as unknown as number,
        afterLines: '1' as unknown as number,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
      expect(parsedResult.formattedOutput.length).toBeGreaterThan(0);
    });

    it('should handle mixed string and number parameters', async () => {
      mockOutputLines('line 1\npattern match\nline 3\nanother pattern\nline 5');

      // Test with some parameters as strings and others as numbers
      const result = await toolHandler({
        outputId: 'test-id',
        pattern: 'pattern',
        contextLines: '1' as unknown as number,
        beforeLines: 2,
        afterLines: '0' as unknown as number,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.description).toContain('Found 2 match(es)');
    });
  });
});
