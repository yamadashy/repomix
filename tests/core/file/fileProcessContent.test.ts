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

  it('should add line numbers to compressed content when both options are enabled', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;\nconst y = 2;\nconst z = 3;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: true,
      },
    } as RepomixConfigMerged;

    vi.mocked(parseFile).mockResolvedValue('compressed line 1\ncompressed line 2');

    const result = await processContent(rawFile, config);
    expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
    expect(result).toBe('1: compressed line 1\n2: compressed line 2');
  });

  it('should preserve original line numbers when compressed content has line markers', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'line 1\nline 2\nline 3\nline 4\nline 5',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: true,
      },
    } as RepomixConfigMerged;

    // Simulate parseFile returning content with preserved line numbers
    // (skipping lines 2 and 4 as if they were compressed out)
    vi.mocked(parseFile).mockResolvedValue('@LINE:1@line 1\n@LINE:3@line 3\n@LINE:5@line 5');

    const result = await processContent(rawFile, config);
    expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
    expect(result).toBe('1: line 1\n3: line 3\n5: line 5');
  });

  it('should handle chunk separators correctly with preserved line numbers', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'function a() {}\nfunction b() {}',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: true,
      },
    } as RepomixConfigMerged;

    // Simulate parseFile returning chunks with separator
    vi.mocked(parseFile).mockResolvedValue('@LINE:1@function a()\n⋮----\n@LINE:5@function b()');

    const result = await processContent(rawFile, config);
    expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
    // Separator should have padding (1) + ": " (2) = 3 spaces before the separator
    expect(result).toBe('1: function a()\n   ⋮----\n5: function b()');
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
});
