import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import type { FileManipulator } from '../../../src/core/file/fileManipulate.js';
import { processContent } from '../../../src/core/file/fileProcessContent.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { parseFile as parseFileType } from '../../../src/core/treeSitter/parseFile.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';

describe('processContent', () => {
  const mockManipulator = {
    removeComments: vi.fn((content) => content.replace(/\/\/.*/g, '')),
    removeEmptyLines: vi.fn((content) => content.split('\n').filter(Boolean).join('\n')),
  };

  const getFileManipulator = vi.fn<(filePath: string) => FileManipulator | null>();
  const parseFile = vi.fn<typeof parseFileType>();
  const deps = { getFileManipulator, parseFile };

  beforeEach(() => {
    vi.resetAllMocks();
    silenceLogger();
    getFileManipulator.mockReturnValue(mockManipulator as unknown as FileManipulator);
    parseFile.mockResolvedValue('parsed content');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    const result = await processContent(rawFile, config, undefined, deps);
    expect(result).toBe('const x = 1;\n\nconst y = 2;');
    expect(mockManipulator.removeComments).not.toHaveBeenCalled();
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

    const result = await processContent(rawFile, config, undefined, deps);
    expect(mockManipulator.removeComments).toHaveBeenCalledWith(rawFile.content);
    expect(result).toBe('const x = 1; \nconst y = 2;');
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

    const result = await processContent(rawFile, config, undefined, deps);
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

    parseFile.mockResolvedValue(undefined);

    const result = await processContent(rawFile, config, undefined, deps);
    expect(result).toBe(rawFile.content);
  });

  it('should fall back to uncompressed content when parseFile throws', async () => {
    // Safety net: even though parseFile is designed not to throw, a thrown error
    // (e.g. a tree-sitter WASM abort) must not abort the whole pack. The file
    // degrades to its uncompressed content instead.
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
    parseFile.mockRejectedValue(error);

    const result = await processContent(rawFile, config, undefined, deps);
    expect(result).toBe(rawFile.content);
  });

  it('should fall back to comment-stripped content when compression fails after removeComments', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1; // comment\nconst y = 2;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: true,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    // Compression fails, so the fallback should be the already comment-stripped
    // content (the best available content at this stage), not the raw original.
    parseFile.mockResolvedValue(undefined);

    const result = await processContent(rawFile, config, undefined, deps);
    expect(mockManipulator.removeComments).toHaveBeenCalledWith(rawFile.content);
    expect(result).toBe('const x = 1; \nconst y = 2;');
  });

  it('should handle files without a manipulator', async () => {
    const rawFile: RawFile = {
      path: 'test.unknown',
      content: 'some content',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: true,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    getFileManipulator.mockReturnValue(null);

    const result = await processContent(rawFile, config, undefined, deps);
    expect(result).toBe('some content');
  });

  it('should compress based on the passed level even when global compress is off', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: false,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config, 'compress', deps);
    expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
    expect(result).toBe('parsed content');
  });

  it('should not compress when the passed level is "full" even if global compress is on', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config, 'full', deps);
    expect(parseFile).not.toHaveBeenCalled();
    expect(result).toBe('const x = 1;');
  });

  it('should fall back to resolving the level from config when none is passed', async () => {
    const rawFile: RawFile = {
      path: 'test.ts',
      content: 'const x = 1;',
    };
    const config: RepomixConfigMerged = {
      output: {
        removeComments: false,
        removeEmptyLines: false,
        compress: true,
        showLineNumbers: false,
      },
    } as RepomixConfigMerged;

    const result = await processContent(rawFile, config, undefined, deps);
    expect(parseFile).toHaveBeenCalledWith(rawFile.content, rawFile.path, config);
    expect(result).toBe('parsed content');
  });
});
