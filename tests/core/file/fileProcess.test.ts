import { describe, expect, it } from 'vitest';
import type { FileManipulator } from '../../../src/core/file/fileManipulate.js';
import {
  applyPostCompressTransforms,
  applyPreCompressTransforms,
  processFiles,
} from '../../../src/core/file/fileProcess.js';
import type { ProcessedFile, RawFile } from '../../../src/core/file/fileTypes.js';
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
    it('should process multiple files with worker path', async () => {
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

    it('should process files with lightweight-only config', async () => {
      const mockRawFiles: RawFile[] = [
        { path: 'file1.js', content: '  const a = 1;  \n\n' },
        { path: 'file2.js', content: '\nconst b = 2;\n\n' },
      ];
      const config = createMockConfig({
        output: {
          removeComments: false,
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
  });

  describe('applyPreCompressTransforms', () => {
    it('should truncate base64 when configured', () => {
      const base64 =
        'DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOozfIXPGGGq9D1Gj9kia7T+B1CZ4yx1vsgRWqPtNn+I0htkrfcASZLcJW63wQpTnOYveIHLFF2m8DlCi9UeZ7D6A==';
      const files: ProcessedFile[] = [{ path: 'test.js', content: `const img = "${base64}";` }];
      const config = createMockConfig({
        output: {
          truncateBase64: true,
        },
      });

      const result = applyPreCompressTransforms(files, config);

      expect(result[0].content).toContain('...');
      expect(result[0].content.length).toBeLessThan(files[0].content.length);
    });

    it('should return files as-is when truncateBase64 is disabled', () => {
      const files: ProcessedFile[] = [{ path: 'test.js', content: 'hello' }];
      const config = createMockConfig();

      const result = applyPreCompressTransforms(files, config);

      expect(result).toBe(files);
    });
  });

  describe('applyPostCompressTransforms', () => {
    it('should remove empty lines when configured', () => {
      const files: ProcessedFile[] = [{ path: 'test.js', content: 'line1\n\nline2\n\nline3' }];
      const config = createMockConfig({
        output: {
          removeEmptyLines: true,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.js', content: 'line1\nline2\nline3' }]);
    });

    it('should not remove empty lines for files without a manipulator', () => {
      const files: ProcessedFile[] = [{ path: 'test.unknown', content: 'line1\n\nline2' }];
      const config = createMockConfig({
        output: {
          removeEmptyLines: true,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.unknown', content: 'line1\n\nline2' }]);
    });

    it('should trim content', () => {
      const files: ProcessedFile[] = [{ path: 'test.js', content: '  hello  \n' }];
      const config = createMockConfig();

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.js', content: 'hello' }]);
    });

    it('should add line numbers when showLineNumbers is true', () => {
      const files: ProcessedFile[] = [{ path: 'test.txt', content: 'Line 1\nLine 2\nLine 3' }];
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.txt', content: '1: Line 1\n2: Line 2\n3: Line 3' }]);
    });

    it('should not add line numbers when showLineNumbers is false', () => {
      const files: ProcessedFile[] = [{ path: 'test.txt', content: 'Line 1\nLine 2\nLine 3' }];
      const config = createMockConfig({
        output: {
          showLineNumbers: false,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.txt', content: 'Line 1\nLine 2\nLine 3' }]);
    });

    it('should handle empty content when showLineNumbers is true', () => {
      const files: ProcessedFile[] = [{ path: 'empty.txt', content: '' }];
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'empty.txt', content: '1: ' }]);
    });

    it('should pad line numbers correctly for files with many lines', () => {
      const content = Array(100).fill('Line').join('\n');
      const files: ProcessedFile[] = [{ path: 'long.txt', content }];
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      const lines = result[0].content.split('\n');
      expect(lines[0]).toBe('  1: Line');
      expect(lines[9]).toBe(' 10: Line');
      expect(lines[99]).toBe('100: Line');
    });

    it('should not add line numbers when compress is enabled', () => {
      const files: ProcessedFile[] = [{ path: 'test.txt', content: 'Line 1\nLine 2' }];
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
          compress: true,
        },
      });

      const result = applyPostCompressTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.txt', content: 'Line 1\nLine 2' }]);
    });
  });
});
