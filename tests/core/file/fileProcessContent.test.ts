import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { getFileManipulator } from '../../../src/core/file/fileManipulate.js';
import { processContent } from '../../../src/core/file/fileProcessContent.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';

vi.mock('../../../src/core/file/fileManipulate.js');
vi.mock('../../../src/core/treeSitter/parseFile.js');
vi.mock('../../../src/shared/logger.js');

describe('processContent', () => {
  const mockManipulator = {
    removeComments: vi.fn((content) => content.replace(/\/\/.*/g, '')),
    removeEmptyLines: vi.fn((content) => content.split('\n').filter(Boolean).join('\n')),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getFileManipulator).mockReturnValue(mockManipulator);
    vi.mocked(parseFile).mockResolvedValue('parsed content');
  });

  it('should process content with default config', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\n\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(result).toBe('const x = 1;\n\nconst y = 2;');
    expect(mockManipulator.removeComments).not.toHaveBeenCalled();
    expect(mockManipulator.removeEmptyLines).not.toHaveBeenCalled();
  });

  it('should remove comments when configured', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1; // comment\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: true,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(mockManipulator.removeComments).toHaveBeenCalledWith(rawFile.content);
    expect(result).toBe('const x = 1; \nconst y = 2;');
  });

  it('should remove empty lines when configured', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\n\n\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: true,
        compress: false,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(mockManipulator.removeEmptyLines).toHaveBeenCalledWith(rawFile.content);
    expect(result).toBe('const x = 1;\nconst y = 2;');
  });

  it('should compress content using Tree-sitter when configured', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
    expect(result).toBe('parsed content');
  });

  it('should handle Tree-sitter parse failure gracefully', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    vi.mocked(parseFile).mockResolvedValue(undefined);

    const result = await processContent(rawFile, config);
    expect(result).toBe(rawFile.content);
  });

  it('should handle Tree-sitter parse error', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const error = new Error('Parse error');
    vi.mocked(parseFile).mockRejectedValue(error);

    await expect(processContent(rawFile, config)).rejects.toThrow('Parse error');
  });

  it('should add line numbers when configured', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;\nconst z = 3;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: true,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(result).toBe('1: const x = 1;\n2: const y = 2;\n3: const z = 3;');
  });

  it('should handle files without a manipulator', async () => {
    const rawFile: RawFile = {
      path: 'test.unknown',
      content: 'some content',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: true,
        removeEmptyLines: true,
        compress: false,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    vi.mocked(getFileManipulator).mockReturnValue(null);

    const result = await processContent(rawFile, config);
    expect(result).toBe('some content');
  });

  describe('ellipsis (...) preservation', () => {
    it('should preserve ... in TypeScript spread operator without any processing', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'const arr = [...items];',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toBe('const arr = [...items];');
    });

    it('should preserve ... with removeComments enabled', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: '// Comment\nconst arr = [...items];',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: true,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toContain('[...items]');
    });

    it('should preserve ... with removeEmptyLines enabled', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'const arr = [...items];\n\nconst x = 1;',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: true,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toContain('[...items]');
    });

    it('should preserve ... with showLineNumbers enabled', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'const arr = [...items];',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: true,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toContain('[...items]');
    });

    it('should preserve ... with compress enabled (Tree-sitter)', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'function test(...args: any[]) { return args; }',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: true,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      // Mock parseFile to preserve ...
      vi.mocked(parseFile).mockResolvedValue('function test(...args: any[])');

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toContain('...args');
    });

    it('should preserve multiple ... in same content', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'function test(...args: any[]) {\n  return [...args];\n}',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...args');
      expect(result).toContain('[...args]');
      // Count occurrences of ...
      const ellipsisCount = (result.match(/\.\.\./g) || []).length;
      expect(ellipsisCount).toBe(2);
    });

    it('should preserve ... in object spread', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'const obj = { ...props };',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toContain('...props');
    });

    it('should preserve standalone ...', async () => {
      const rawFile: RawFile = {
        path: 'test.py',
        content: '# ...\npass',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
    });

    it('should preserve ... in strings', async () => {
      const rawFile: RawFile = {
        path: 'test.ts',
        content: 'const msg = "Loading...";',
      };
      const config: RepomixConfigMerged = {
        output: {
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          showLineNumbers: false,
        },
      } as RepomixConfigMerged;

      const result = await processContent(rawFile, config);
      expect(result).toContain('...');
      expect(result).toContain('Loading...');
    });
  });
});
