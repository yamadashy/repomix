import { describe, expect, it } from 'vitest';
import type { FileManipulator } from '../../../src/core/file/fileManipulate.js';
import { processFiles } from '../../../src/core/file/fileProcess.js';
import { processContent } from '../../../src/core/file/fileProcessContent.js';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { FileProcessTask } from '../../../src/core/file/workers/fileProcessWorker.js';
import fileProcessWorker from '../../../src/core/file/workers/fileProcessWorker.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import { createMockConfig } from '../../testing/testUtils.js';

const createMockFileManipulator = (): FileManipulator => ({
  removeComments: (content: string) => content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''),
  removeEmptyLines: (content: string) => content.replace(/^\s*[\r\n]/gm, ''),
});

const mockGetFileManipulator = (filePath: string): FileManipulator | null => {
  if (filePath.endsWith('.js')) {
    return createMockFileManipulator();
  }
  return null;
};

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await fileProcessWorker(task as FileProcessTask)) as R;
    },
    cleanup: async () => {
      // Mock cleanup - no-op for tests
    },
  };
};

describe('fileProcess', () => {
  describe('processFiles', () => {
    it('should process multiple files', async () => {
      const mockRawFiles: RawFile[] = [
        { path: 'file1.js', content: '// comment\nconst a = 1;' },
        { path: 'file2.js', content: '/* comment */\nconst b = 2;' },
      ];
      const config = createMockConfig({
        output: {
          removeComments: true,
          removeEmptyLines: true,
        },
      });

      const result = await processFiles(mockRawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([
        { path: 'file1.js', content: 'const a = 1;' },
        { path: 'file2.js', content: 'const b = 2;' },
      ]);
    });

    it('should use main-thread processing when compress and removeComments are both false', async () => {
      const mockRawFiles: RawFile[] = [
        { path: 'file1.js', content: '  const a = 1;  ' },
        { path: 'file2.ts', content: 'const b = 2;\n' },
      ];
      const config = createMockConfig({
        output: {
          compress: false,
          removeComments: false,
          removeEmptyLines: false,
          truncateBase64: false,
          showLineNumbers: false,
        },
      });

      // Pass null deps to trigger main-thread path
      const result = await processFiles(mockRawFiles, config, () => {}, null);

      expect(result).toEqual([
        { path: 'file1.js', content: 'const a = 1;' },
        { path: 'file2.ts', content: 'const b = 2;' },
      ]);
    });

    it('should handle truncateBase64 in main-thread processing', async () => {
      const mockRawFiles: RawFile[] = [{ path: 'file1.js', content: 'const a = 1;' }];
      const config = createMockConfig({
        output: {
          compress: false,
          removeComments: false,
          removeEmptyLines: false,
          truncateBase64: true,
          showLineNumbers: false,
        },
      });

      const result = await processFiles(mockRawFiles, config, () => {}, null);

      expect(result).toEqual([{ path: 'file1.js', content: 'const a = 1;' }]);
    });

    it('should handle showLineNumbers in main-thread processing', async () => {
      const mockRawFiles: RawFile[] = [{ path: 'file1.txt', content: 'Line 1\nLine 2\nLine 3' }];
      const config = createMockConfig({
        output: {
          compress: false,
          removeComments: false,
          removeEmptyLines: false,
          truncateBase64: false,
          showLineNumbers: true,
        },
      });

      const result = await processFiles(mockRawFiles, config, () => {}, null);

      expect(result).toEqual([{ path: 'file1.txt', content: '1: Line 1\n2: Line 2\n3: Line 3' }]);
    });

    it('should handle removeEmptyLines in main-thread processing', async () => {
      const mockRawFiles: RawFile[] = [{ path: 'file1.js', content: 'line1\n\nline2\n\nline3' }];
      const config = createMockConfig({
        output: {
          compress: false,
          removeComments: false,
          removeEmptyLines: true,
          truncateBase64: false,
          showLineNumbers: false,
        },
      });

      const result = await processFiles(mockRawFiles, config, () => {}, null);

      expect(result).toEqual([{ path: 'file1.js', content: 'line1\nline2\nline3' }]);
    });

    it('should use worker pool when removeComments is true', async () => {
      const mockRawFiles: RawFile[] = [{ path: 'file1.js', content: '// comment\nconst a = 1;' }];
      const config = createMockConfig({
        output: {
          compress: false,
          removeComments: true,
          removeEmptyLines: false,
        },
      });

      const result = await processFiles(mockRawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'file1.js', content: 'const a = 1;' }]);
    });
  });

  describe('processContent', () => {
    it('should remove comments and empty lines when configured', async () => {
      const content = '// comment\nconst a = 1;\n\n/* multi-line\ncomment */\nconst b = 2;';
      const filePath = 'test.js';
      const config = createMockConfig({
        output: {
          removeComments: true,
          removeEmptyLines: true,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      expect(result).toBe('const a = 1;\nconst b = 2;');
    });

    it('should not remove comments or empty lines when not configured', async () => {
      const content = '// comment\nconst a = 1;\n\n/* multi-line\ncomment */\nconst b = 2;';
      const filePath = 'test.js';
      const config = createMockConfig({
        output: {
          removeComments: false,
          removeEmptyLines: false,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      expect(result).toBe(content.trim());
    });

    it('should handle files without a manipulator', async () => {
      const content = 'Some content';
      const filePath = 'unknown.ext';
      const config = createMockConfig({
        output: {
          removeComments: true,
          removeEmptyLines: true,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      expect(result).toBe(content);
    });

    it('should add line numbers when showLineNumbers is true', async () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const filePath = 'test.txt';
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
          removeComments: false,
          removeEmptyLines: false,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      expect(result).toBe('1: Line 1\n2: Line 2\n3: Line 3');
    });

    it('should not add line numbers when showLineNumbers is false', async () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const filePath = 'test.txt';
      const config = createMockConfig({
        output: {
          showLineNumbers: false,
          removeComments: false,
          removeEmptyLines: false,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle empty content when showLineNumbers is true', async () => {
      const content = '';
      const filePath = 'empty.txt';
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
          removeComments: false,
          removeEmptyLines: false,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      expect(result).toBe('1: ');
    });

    it('should pad line numbers correctly for files with many lines', async () => {
      const content = Array(100).fill('Line').join('\n');
      const filePath = 'long.txt';
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
          removeComments: false,
          removeEmptyLines: false,
        },
      });

      const result = await processContent({ path: filePath, content }, config);

      const lines = result.split('\n');
      expect(lines[0]).toBe('  1: Line');
      expect(lines[9]).toBe(' 10: Line');
      expect(lines[99]).toBe('100: Line');
    });
  });
});
