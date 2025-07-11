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

  // New tests for originalLineNumbers feature
  it('should add line numbers to original content when originalLineNumbers is true', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1; // comment\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: true,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: true,
        originalLineNumbers: true,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    // Line numbers should be added before comment removal
    expect(result).toBe('1: const x = 1; \n2: const y = 2;');
    // Comments should be removed after line numbers are added
    expect(mockManipulator.removeComments).toHaveBeenCalledWith('1: const x = 1; // comment\n2: const y = 2;');
  });

  it('should add line numbers after processing when originalLineNumbers is false', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1; // comment\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: true,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: true,
        originalLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    // Comments should be removed before line numbers are added
    expect(mockManipulator.removeComments).toHaveBeenCalledWith(rawFile.content);
    // Line numbers should be added after comment removal
    expect(result).toBe('1: const x = 1; \n2: const y = 2;');
  });

  it('should not add line numbers when showLineNumbers is false, regardless of originalLineNumbers', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: false,
        originalLineNumbers: true,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(result).toBe('const x = 1;\nconst y = 2;');
  });

  it('should handle interaction between originalLineNumbers and compression', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: true,
        originalLineNumbers: true,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    // Line numbers should be added before compression
    expect(parseFile).toHaveBeenCalledWith('1: const x = 1;\n2: const y = 2;', rawFile.path, config);
    expect(result).toBe('parsed content');
  });

  it('should handle empty content correctly with originalLineNumbers', async () => {
    const rawFile: RawFile = {
      path: 'empty.ts',
      content: '',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: true,
        originalLineNumbers: true,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    expect(result).toBe('1:');
  });

  it('should pad line numbers correctly based on total lines with originalLineNumbers', async () => {
    const content = Array(100).fill('Line').join('\n');
    const rawFile: RawFile = {
      path: 'long.ts',
      content,
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: true,
        originalLineNumbers: true,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config);
    const lines = result.split('\n');

    expect(lines[0]).toBe('1: Line');
    expect(lines[9]).toBe(' 10: Line');
    expect(lines[99]).toBe('100: Line');
  });
});
