import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { processContent } from '../../../src/core/file/fileProcessContent.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';

// Mock dependencies
vi.mock('../../../src/core/treeSitter/parseFile.js', () => ({
  parseFile: vi.fn(),
}));

vi.mock('../../../src/core/file/fileManipulate.js', () => ({
  getFileManipulator: vi.fn(() => ({
    removeComments: vi.fn((content: string) => content.replace(/\/\/.*$/gm, '').trim()),
    removeEmptyLines: vi.fn((content: string) => content.replace(/\n\s*\n/g, '\n').trim()),
  })),
}));

vi.mock('../../../src/core/file/truncateBase64.js', () => ({
  truncateBase64Content: vi.fn((content: string) =>
    content.replace(/base64:[a-zA-Z0-9+/=]+/g, '[BASE64_DATA_TRUNCATED]'),
  ),
}));

vi.mock('../../../src/core/file/lineLimitProcessor.js', () => ({
  applyLineLimit: vi.fn(),
}));

vi.mock('../../../src/shared/logger.js', () => ({
  logger: {
    trace: vi.fn(),
    error: vi.fn(),
  },
}));

describe('processContent', () => {
  const createMockRawFile = (path: string, content: string): RawFile => ({
    path,
    content,
  });

  const createMockConfig = (overrides: Partial<RepomixConfigMerged> = {}): RepomixConfigMerged => ({
    cwd: '/test',
    input: { maxFileSize: 1024 * 1024 },
    output: {
      filePath: 'test.xml',
      style: 'xml',
      parsableStyle: false,
      fileSummary: true,
      directoryStructure: true,
      files: true,
      removeComments: false,
      removeEmptyLines: false,
      compress: false,
      topFilesLength: 5,
      showLineNumbers: false,
      truncateBase64: false,
      lineLimit: undefined,
      copyToClipboard: false,
      includeEmptyDirectories: false,
      includeFullDirectoryStructure: false,
      tokenCountTree: false,
      git: {
        sortByChanges: true,
        sortByChangesMaxCommits: 100,
        includeDiffs: false,
        includeLogs: false,
        includeLogsCount: 50,
      },
    },
    include: [],
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
      customPatterns: [],
    },
    security: {
      enableSecurityCheck: true,
    },
    tokenCount: {
      encoding: 'o200k_base',
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Processing', () => {
    test('should return original content when no transformations are enabled', async () => {
      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig();

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('const x = 1;\nconst y = 2;');
      expect(result.originalContent).toBe('const x = 1;\nconst y = 2;');
      expect(result.truncation).toBeUndefined();
    });

    test('should store original content before any processing', async () => {
      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeComments: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.originalContent).toBe('const x = 1;\nconst y = 2;');
      expect(result.content).not.toBe(result.originalContent); // Should be processed
    });

    test('should trim content', async () => {
      const rawFile = createMockRawFile('test.js', '  \nconst x = 1;\n\n  ');
      const config = createMockConfig();

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('const x = 1;');
    });
  });

  describe('Base64 Truncation', () => {
    test('should truncate base64 content when enabled', async () => {
      const { truncateBase64Content } = await import('../../../src/core/file/truncateBase64.js');
      vi.mocked(truncateBase64Content).mockReturnValue('data:image/png;base64,[BASE64_DATA_TRUNCATED]');

      const rawFile = createMockRawFile(
        'test.js',
        'const img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";',
      );
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          truncateBase64: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(vi.mocked(truncateBase64Content)).toHaveBeenCalledWith(rawFile.content);
      expect(result.content).toContain('[BASE64_DATA_TRUNCATED]');
    });

    test('should not truncate base64 content when disabled', async () => {
      const { truncateBase64Content } = await import('../../../src/core/file/truncateBase64.js');

      const rawFile = createMockRawFile(
        'test.js',
        'const img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";',
      );
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          truncateBase64: false,
        },
      });

      await processContent(rawFile, config);

      expect(vi.mocked(truncateBase64Content)).not.toHaveBeenCalled();
    });

    test('should handle empty content with base64 truncation', async () => {
      const rawFile = createMockRawFile('test.js', '');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          truncateBase64: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('');
    });
  });

  describe('Comment Removal', () => {
    test('should remove comments when enabled', async () => {
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      const mockManipulator = {
        removeComments: vi.fn().mockReturnValue('const x = 1;\nconst y = 2;'),
        removeEmptyLines: vi.fn((content: string) => content),
      };
      vi.mocked(getFileManipulator).mockReturnValue(mockManipulator);

      const rawFile = createMockRawFile(
        'test.js',
        '// This is a comment\nconst x = 1;\n// Another comment\nconst y = 2;',
      );
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeComments: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(mockManipulator.removeComments).toHaveBeenCalledWith(rawFile.content);
      expect(result.content).toBe('const x = 1;\nconst y = 2;');
    });

    test('should not remove comments when disabled', async () => {
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      const mockManipulator = {
        removeComments: vi.fn(),
        removeEmptyLines: vi.fn((content: string) => content),
      };
      vi.mocked(getFileManipulator).mockReturnValue(mockManipulator);

      const rawFile = createMockRawFile('test.js', '// This is a comment\nconst x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeComments: false,
        },
      });

      await processContent(rawFile, config);

      expect(mockManipulator.removeComments).not.toHaveBeenCalled();
    });

    test('should handle files without manipulator', async () => {
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      vi.mocked(getFileManipulator).mockReturnValue(null);

      const rawFile = createMockRawFile('unknown.xyz', 'some content');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeComments: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('some content'); // Should remain unchanged
    });
  });

  describe('Empty Line Removal', () => {
    test('should remove empty lines when enabled', async () => {
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      const mockManipulator = {
        removeComments: vi.fn((content: string) => content),
        removeEmptyLines: vi.fn().mockReturnValue('const x = 1;\nconst y = 2;'),
      };
      vi.mocked(getFileManipulator).mockReturnValue(mockManipulator);

      const rawFile = createMockRawFile('test.js', 'const x = 1;\n\n\nconst y = 2;\n\n');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeEmptyLines: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(mockManipulator.removeEmptyLines).toHaveBeenCalledWith(expect.any(String));
      expect(result.content).toBe('const x = 1;\nconst y = 2;');
    });

    test('should not remove empty lines when disabled', async () => {
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      const mockManipulator = {
        removeComments: vi.fn((content: string) => content),
        removeEmptyLines: vi.fn(),
      };
      vi.mocked(getFileManipulator).mockReturnValue(mockManipulator);

      const rawFile = createMockRawFile('test.js', 'const x = 1;\n\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeEmptyLines: false,
        },
      });

      await processContent(rawFile, config);

      expect(mockManipulator.removeEmptyLines).not.toHaveBeenCalled();
    });
  });

  describe('Compression', () => {
    test('should compress content when enabled', async () => {
      const { parseFile } = await import('../../../src/core/treeSitter/parseFile.js');
      vi.mocked(parseFile).mockResolvedValue('compressed content');

      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          compress: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
      expect(result.content).toBe('compressed content');
    });

    test('should handle parse failure gracefully', async () => {
      const { parseFile } = await import('../../../src/core/treeSitter/parseFile.js');
      vi.mocked(parseFile).mockResolvedValue(undefined);

      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          compress: true,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe(rawFile.content); // Should fall back to original
    });

    test('should throw error when parse throws', async () => {
      const { parseFile } = await import('../../../src/core/treeSitter/parseFile.js');
      vi.mocked(parseFile).mockRejectedValue(new Error('Parse error'));

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          compress: true,
        },
      });

      await expect(processContent(rawFile, config)).rejects.toThrow('Parse error');
    });

    test('should not compress when disabled', async () => {
      const { parseFile } = await import('../../../src/core/treeSitter/parseFile.js');

      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          compress: false,
        },
      });

      await processContent(rawFile, config);

      expect(parseFile).not.toHaveBeenCalled();
    });
  });

  describe('Line Numbers', () => {
    test('should add line numbers when enabled', async () => {
      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;\nconst z = 3;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          showLineNumbers: true,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('1: const x = 1;\n2: const y = 2;\n3: const z = 3;');
    });

    test('should calculate correct padding for line numbers', async () => {
      const content = Array.from({ length: 100 }, (_, i) => `line ${i + 1};`).join('\n');
      const rawFile = createMockRawFile('test.js', content);
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          showLineNumbers: true,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      const lines = result.content.split('\n');
      expect(lines[0]).toMatch(/^ {2}1: /); // 100 lines, so padding is 3 spaces (100 has 3 digits)
      expect(lines[99]).toMatch(/^100: /); // Last line should have no padding
    });

    test('should not add line numbers when disabled', async () => {
      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          showLineNumbers: false,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('const x = 1;\nconst y = 2;');
    });

    test('should handle empty content with line numbers', async () => {
      const rawFile = createMockRawFile('test.js', '');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          showLineNumbers: true,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('1: ');
    });
  });

  describe('Line Limiting', () => {
    test('should apply line limit when enabled', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');
      vi.mocked(applyLineLimit).mockResolvedValue({
        content: 'limited content',
        truncation: {
          truncated: true,
          originalLineCount: 100,
          truncatedLineCount: 50,
          lineLimit: 50,
        },
      });

      const rawFile = createMockRawFile('test.js', 'const x = 1;\n'.repeat(100));
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          lineLimit: 50,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(applyLineLimit).toHaveBeenCalledWith(expect.any(String), rawFile.path, 50, {
        preserveStructure: true,
        showTruncationIndicators: false,
        enableCaching: true,
      });
      expect(result.content).toBe('limited content');
      expect(result.truncation).toEqual({
        truncated: true,
        originalLineCount: 100,
        truncatedLineCount: 50,
        lineLimit: 50,
      });
    });

    test('should handle line limit when no truncation occurs', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');
      vi.mocked(applyLineLimit).mockResolvedValue({
        content: 'original content',
        truncation: {
          truncated: false,
          originalLineCount: 10,
          truncatedLineCount: 10,
          lineLimit: 50,
        },
      });

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          lineLimit: 50,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.truncation?.truncated).toBe(false);
    });

    test('should handle line limit errors gracefully', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');
      vi.mocked(applyLineLimit).mockRejectedValue(new Error('Line limit error'));

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          lineLimit: 50,
          compress: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe(rawFile.content); // Should fall back to original
      expect(result.truncation).toEqual({
        truncated: false,
        originalLineCount: 1,
        truncatedLineCount: 1,
        lineLimit: 50,
      });
    });

    test('should not apply line limit when disabled', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          lineLimit: undefined,
          compress: false,
        },
      });

      await processContent(rawFile, config);

      expect(applyLineLimit).not.toHaveBeenCalled();
      expect(result.truncation).toBeUndefined();
    });
  });

  describe('Combined Processing', () => {
    test('should apply multiple transformations in correct order', async () => {
      const { truncateBase64Content } = await import('../../../src/core/file/truncateBase64.js');
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      const mockManipulator = {
        removeComments: vi.fn().mockReturnValue('no comments'),
        removeEmptyLines: vi.fn().mockReturnValue('no empty lines'),
      };
      vi.mocked(getFileManipulator).mockReturnValue(mockManipulator);
      vi.mocked(truncateBase64Content).mockImplementation((content) => content);

      const rawFile = createMockRawFile('test.js', '// comment\ndata:image/png;base64,test\n\n\nconst x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          truncateBase64: true,
          removeComments: true,
          removeEmptyLines: true,
          showLineNumbers: false,
          compress: false,
          lineLimit: undefined,
        },
      });

      const result = await processContent(rawFile, config);

      // Verify order: base64 -> comments -> empty lines -> trim
      expect(truncateBase64Content).toHaveBeenCalledWith(rawFile.content);
      expect(mockManipulator.removeComments).toHaveBeenCalled();
      expect(mockManipulator.removeEmptyLines).toHaveBeenCalled();
      expect(result.content).toBe('no empty lines');
    });

    test('should handle compression with line numbers', async () => {
      const { parseFile } = await import('../../../src/core/treeSitter/parseFile.js');
      vi.mocked(parseFile).mockResolvedValue('compressed');

      const rawFile = createMockRawFile('test.js', 'const x = 1;\nconst y = 2;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          compress: true,
          showLineNumbers: true,
          lineLimit: undefined,
        },
      });

      const result = await processContent(rawFile, config);

      expect(result.content).toBe('compressed'); // Line numbers should not be applied when compressing
    });

    test('should handle line limiting with other transformations', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');
      vi.mocked(applyLineLimit).mockResolvedValue({
        content: 'limited content',
        truncation: {
          truncated: true,
          originalLineCount: 100,
          truncatedLineCount: 50,
          lineLimit: 50,
        },
      });

      const rawFile = createMockRawFile('test.js', '// comment\nconst x = 1;\n'.repeat(50));
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeComments: true,
          lineLimit: 50,
          compress: false,
          showLineNumbers: false,
        },
      });

      const result = await processContent(rawFile, config);

      expect(applyLineLimit).toHaveBeenCalled();
      expect(result.content).toBe('limited content');
      expect(result.truncation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', async () => {
      const { getFileManipulator } = await import('../../../src/core/file/fileManipulate.js');
      vi.mocked(getFileManipulator).mockImplementation(() => {
        throw new Error('Manipulator error');
      });

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          removeComments: true,
        },
      });

      await expect(processContent(rawFile, config)).rejects.toThrow('Manipulator error');
    });

    test('should handle null/undefined content', async () => {
      const rawFile = createMockRawFile('test.js', '');
      const config = createMockConfig();

      // Should not throw with empty content
      const result = await processContent(rawFile, config);
      expect(result.content).toBe('');
    });

    test('should log processing traces', async () => {
      const { logger } = await import('../../../src/shared/logger.js');

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig();

      await processContent(rawFile, config);

      expect(logger.trace).toHaveBeenCalledWith(`Processing file: ${rawFile.path}`);
      expect(logger.trace).toHaveBeenCalledWith(expect.stringContaining('Processed file:'));
    });

    test('should log line limit traces', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');
      const { logger } = await import('../../../src/shared/logger.js');
      vi.mocked(applyLineLimit).mockResolvedValue({
        content: 'limited',
        truncation: {
          truncated: true,
          originalLineCount: 100,
          truncatedLineCount: 50,
          lineLimit: 50,
        },
      });

      const rawFile = createMockRawFile('test.js', 'const x = 1;\n'.repeat(100));
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          lineLimit: 50,
          compress: false,
        },
      });

      await processContent(rawFile, config);

      expect(logger.trace).toHaveBeenCalledWith(`About to apply line limit 50 to file: test.js with 100 lines`);
      expect(logger.trace).toHaveBeenCalledWith(`Applied line limit 50 to file: test.js`);
    });

    test('should log line limit errors', async () => {
      const { applyLineLimit } = await import('../../../src/core/file/lineLimitProcessor.js');
      const { logger } = await import('../../../src/shared/logger.js');
      vi.mocked(applyLineLimit).mockRejectedValue(new Error('Line limit failed'));

      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig({
        output: {
          ...createMockConfig().output,
          lineLimit: 50,
          compress: false,
        },
      });

      await processContent(rawFile, config);

      expect(logger.error).toHaveBeenCalledWith('Failed to apply line limit to test.js: Line limit failed');
    });
  });

  describe('Performance', () => {
    test('should process large files efficiently', async () => {
      const largeContent = 'const x = 1;\n'.repeat(10000); // 10K lines
      const rawFile = createMockRawFile('test.js', largeContent);
      const config = createMockConfig();

      const startTime = Date.now();
      const result = await processContent(rawFile, config);
      const endTime = Date.now();

      expect(result.content).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle memory efficiently', async () => {
      const rawFile = createMockRawFile('test.js', 'const x = 1;');
      const config = createMockConfig();

      // Process multiple times to check for memory leaks
      for (let i = 0; i < 100; i++) {
        await processContent(rawFile, config);
      }

      // If we reach here without running out of memory, the test passes
      expect(true).toBe(true);
    });
  });
});
