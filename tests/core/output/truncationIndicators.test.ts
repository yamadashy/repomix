import process from 'node:process';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import { generateOutput } from '../../../src/core/output/outputGenerate.js';
import { createMockConfig } from '../../testing/testUtils.js';

describe('Truncation Indicators', () => {
  let mockConfig: RepomixConfigMerged;
  let mockFiles: ProcessedFile[];

  beforeEach(() => {
    mockConfig = createMockConfig({
      output: {
        filePath: './test-output.txt',
        style: 'xml',
        removeComments: false,
        removeEmptyLines: false,
        topFilesLength: 0,
        showLineNumbers: false,
        parsableStyle: false,
      },
    });

    mockFiles = [
      {
        path: 'src/example.js',
        content: 'line 1\nline 2\nline 3',
        truncation: {
          truncated: true,
          originalLineCount: 10,
          truncatedLineCount: 3,
          lineLimit: 3,
        },
      },
      {
        path: 'src/normal.js',
        content: 'line 1\nline 2\nline 3',
        truncation: {
          truncated: false,
          originalLineCount: 3,
          truncatedLineCount: 3,
          lineLimit: 10,
        },
      },
      {
        path: 'src/undefined.js',
        content: 'line 1\nline 2\nline 3',
        // No truncation property - should handle gracefully
      },
    ];
  });

  describe('XML Output Style', () => {
    it('should include truncation indicator for truncated files', async () => {
      mockConfig.output.style = 'xml';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('<!-- truncated: showing 3 of 10 lines -->');
      expect(result).toContain('<file path="src/example.js">');
      expect(result).toContain('</file>');
    });

    it('should not include truncation indicator for non-truncated files', async () => {
      mockConfig.output.style = 'xml';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      // Should not contain truncation indicator for normal.js
      expect(result).not.toMatch(/<file path="src\/normal\.js">[\s\S]*?<!-- truncated: showing[\s\S]*?<\/file>/);
    });

    it('should handle files without truncation property gracefully', async () => {
      mockConfig.output.style = 'xml';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      // Should handle undefined truncation without errors
      expect(result).toContain('<file path="src/undefined.js">');
      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('</file>');
    });

    it('should include truncation indicator in parsable XML', async () => {
      mockConfig.output.style = 'xml';
      mockConfig.output.parsableStyle = true;
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('<#comment>truncated: showing 3 of 10 lines</#comment>');
    });
  });

  describe('Markdown Output Style', () => {
    it('should include truncation indicator for truncated files', async () => {
      mockConfig.output.style = 'markdown';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('// ... (truncated: showing 3 of 10 lines)');
      expect(result).toContain('```javascript');
      expect(result).toContain('```');
    });

    it('should not include truncation indicator for non-truncated files', async () => {
      mockConfig.output.style = 'markdown';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      // Should not contain truncation indicator for normal.js
      expect(result).not.toMatch(/```javascript src\/normal\.js[\s\S]*?\/\/ \.\.\. \(truncated: showing[\s\S]*?```/);
    });

    it('should handle files without truncation property gracefully', async () => {
      mockConfig.output.style = 'markdown';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      // Should handle undefined truncation without errors
      expect(result).toContain('```javascript');
      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('```');
    });

    it('should include truncation indicator in parsable Markdown', async () => {
      mockConfig.output.style = 'markdown';
      mockConfig.output.parsableStyle = true;
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('// ... (truncated: showing 3 of 10 lines)');
    });
  });

  describe('Plain Output Style', () => {
    it('should include truncation indicator for truncated files', async () => {
      mockConfig.output.style = 'plain';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('... (truncated: showing 3 of 10 lines)');
      expect(result).toContain('src/example.js');
    });

    it('should not include truncation indicator for non-truncated files', async () => {
      mockConfig.output.style = 'plain';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      // Should not contain truncation indicator for normal.js
      expect(result).not.toMatch(/src\/normal\.js[\s\S]*?\.\.\. \(truncated: showing[\s\S]*?src\//);
    });

    it('should handle files without truncation property gracefully', async () => {
      mockConfig.output.style = 'plain';
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      // Should handle undefined truncation without errors
      expect(result).toContain('src/undefined.js');
      expect(result).toContain('line 1\nline 2\nline 3');
    });

    it('should include truncation indicator in parsable Plain', async () => {
      mockConfig.output.style = 'plain';
      mockConfig.output.parsableStyle = true;
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      expect(result).toContain('line 1\nline 2\nline 3');
      expect(result).toContain('... (truncated: showing 3 of 10 lines)');
    });
  });

  describe('JSON Output Style', () => {
    it('should include truncation metadata in JSON output', async () => {
      mockConfig.output.style = 'json';
      mockConfig.output.parsableStyle = true;
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      const parsed = JSON.parse(result);
      const exampleFile = parsed.files['src/example.js'];
      const normalFile = parsed.files['src/normal.js'];

      expect(exampleFile.content).toBe('line 1\nline 2\nline 3');
      expect(exampleFile.truncation).toEqual({
        truncated: true,
        originalLineCount: 10,
        truncatedLineCount: 3,
        lineLimit: 3,
      });

      expect(normalFile.content).toBe('line 1\nline 2\nline 3');
      expect(normalFile.truncation).toEqual({
        truncated: false,
        originalLineCount: 3,
        truncatedLineCount: 3,
        lineLimit: 10,
      });
    });

    it('should handle files without truncation property in JSON output', async () => {
      mockConfig.output.style = 'json';
      mockConfig.output.parsableStyle = true;
      const result = await generateOutput([process.cwd()], mockConfig, mockFiles, []);

      const parsed = JSON.parse(result);
      const undefinedFile = parsed.files['src/undefined.js'];

      expect(undefinedFile.content).toBe('line 1\nline 2\nline 3');
      expect(undefinedFile.truncation).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files with truncation', async () => {
      const emptyFile: ProcessedFile = {
        path: 'src/empty.js',
        content: '',
        truncation: {
          truncated: true,
          originalLineCount: 5,
          truncatedLineCount: 0,
          lineLimit: 0,
        },
      };

      mockConfig.output.style = 'xml';
      const result = await generateOutput([process.cwd()], mockConfig, [emptyFile], []);

      expect(result).toContain('<!-- truncated: showing 0 of 5 lines -->');
      expect(result).toContain('<file path="src/empty.js">');
      expect(result).toContain('</file>');
    });

    it('should handle single line files with truncation', async () => {
      const singleLineFile: ProcessedFile = {
        path: 'src/single.js',
        content: 'single line',
        truncation: {
          truncated: true,
          originalLineCount: 10,
          truncatedLineCount: 1,
          lineLimit: 1,
        },
      };

      mockConfig.output.style = 'markdown';
      const result = await generateOutput([process.cwd()], mockConfig, [singleLineFile], []);

      expect(result).toContain('single line');
      expect(result).toContain('// ... (truncated: showing 1 of 10 lines)');
    });

    it('should handle multiple truncated files in the same output', async () => {
      const multipleTruncated: ProcessedFile[] = [
        {
          path: 'src/file1.js',
          content: 'content 1',
          truncation: {
            truncated: true,
            originalLineCount: 5,
            truncatedLineCount: 1,
            lineLimit: 1,
          },
        },
        {
          path: 'src/file2.js',
          content: 'content 2',
          truncation: {
            truncated: true,
            originalLineCount: 8,
            truncatedLineCount: 1,
            lineLimit: 1,
          },
        },
      ];

      mockConfig.output.style = 'plain';
      const result = await generateOutput([process.cwd()], mockConfig, multipleTruncated, []);

      expect(result).toContain('... (truncated: showing 1 of 5 lines)');
      expect(result).toContain('... (truncated: showing 1 of 8 lines)');
      expect(result).toContain('content 1');
      expect(result).toContain('content 2');
    });
  });
});
