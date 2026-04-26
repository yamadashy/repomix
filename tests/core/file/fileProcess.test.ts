import { describe, expect, it } from 'vitest';
import type { FileManipulator } from '../../../src/core/file/fileManipulate.js';
import { applyLightweightTransforms, processFiles } from '../../../src/core/file/fileProcess.js';
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

    it('should apply all transforms in combined worker + lightweight pipeline', async () => {
      const base64 =
        'DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOozfIXPGGGq9D1Gj9kia7T+B1CZ4yx1vsgRWqPtNn+I0htkrfcASZLcJW63wQpTnOYveIHLFF2m8DlCi9UeZ7D6A==';
      const mockRawFiles: RawFile[] = [
        {
          path: 'file1.js',
          content: `// comment\nconst a = 1;\n\nconst img = "${base64}";`,
        },
      ];
      const config = createMockConfig({
        output: {
          removeComments: true,
          removeEmptyLines: true,
          truncateBase64: true,
          showLineNumbers: true,
        },
      });

      const result = await processFiles(mockRawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      // removeComments removes comment, removeEmptyLines cleans up, truncateBase64 truncates, showLineNumbers adds numbers
      expect(result.length).toBe(1);
      expect(result[0].content).toContain('1:');
      expect(result[0].content).toContain('2:');
      expect(result[0].content).toContain('...');
      expect(result[0].content).not.toContain('// comment');
      expect(result[0].content).not.toContain(base64);
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

  describe('applyLightweightTransforms', () => {
    it('should truncate base64 when configured', () => {
      const base64 =
        'DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOozfIXPGGGq9D1Gj9kia7T+B1CZ4yx1vsgRWqPtNn+I0htkrfcASZLcJW63wQpTnOYveIHLFF2m8DlCi9UeZ7D6A==';
      const files: ProcessedFile[] = [{ path: 'test.js', content: `const img = "${base64}";` }];
      const config = createMockConfig({
        output: {
          truncateBase64: true,
        },
      });

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result[0].content).toContain('...');
      expect(result[0].content.length).toBeLessThan(files[0].content.length);
    });

    it('should remove empty lines when configured', () => {
      const files: ProcessedFile[] = [{ path: 'test.js', content: 'line1\n\nline2\n\nline3' }];
      const config = createMockConfig({
        output: {
          removeEmptyLines: true,
        },
      });

      const result = applyLightweightTransforms(files, config, () => {}, {
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

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.unknown', content: 'line1\n\nline2' }]);
    });

    it('should trim content', () => {
      const files: ProcessedFile[] = [{ path: 'test.js', content: '  hello  \n' }];
      const config = createMockConfig();

      const result = applyLightweightTransforms(files, config, () => {}, {
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

      const result = applyLightweightTransforms(files, config, () => {}, {
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

      const result = applyLightweightTransforms(files, config, () => {}, {
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

      const result = applyLightweightTransforms(files, config, () => {}, {
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

      const result = applyLightweightTransforms(files, config, () => {}, {
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

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'test.txt', content: 'Line 1\nLine 2' }]);
    });
  });

  describe('transform ordering invariants', () => {
    // These tests pin the documented order:
    //   [removeComments → compress] (worker) → truncateBase64 → removeEmptyLines → trim → showLineNumbers
    //
    // Reordering bugs are the most likely regression in this pipeline. Each test below
    // would FAIL if its specific ordering invariant got reversed.

    it('removeEmptyLines collapses blank lines created by removeComments', async () => {
      // Mock manipulator's removeComments leaves blank lines exactly where the comment was —
      // the same shape @repomix/strip-comments produces. removeEmptyLines must run AFTER
      // to clean those up.
      const rawFiles: RawFile[] = [
        {
          path: 'file1.js',
          content: 'const a = 1;\n// comment that becomes blank\nconst b = 2;',
        },
      ];
      const config = createMockConfig({
        output: { removeComments: true, removeEmptyLines: true },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      // The blank line left by comment removal must be gone.
      expect(result[0].content).toBe('const a = 1;\nconst b = 2;');
      expect(result[0].content).not.toMatch(/\n\n/);
    });

    it('preserves blank lines when removeEmptyLines is disabled (no implicit cleanup)', async () => {
      const rawFiles: RawFile[] = [
        {
          path: 'file1.js',
          content: 'const a = 1;\n// comment\nconst b = 2;',
        },
      ];
      const config = createMockConfig({
        output: { removeComments: true, removeEmptyLines: false },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      // Comment is stripped but the blank line it left behind must remain.
      expect(result[0].content).toContain('\n\n');
      expect(result[0].content).not.toContain('// comment');
    });

    it('worker and lightweight paths produce identical output for the same input', async () => {
      // Same config except useWorkers is forced on/off via the removeComments switch.
      // The lightweight path runs when removeComments=false, the worker path when true.
      // For input that has no comments to strip, both paths must produce byte-equal output.
      const rawFiles: RawFile[] = [{ path: 'plain.js', content: 'line1\n\nline2\nline3\n' }];
      const baseConfig = (overrides: Record<string, unknown>) =>
        createMockConfig({
          output: {
            removeEmptyLines: true,
            truncateBase64: false,
            ...overrides,
          },
        });

      // Lightweight path (removeComments=false → main thread)
      const lightweightResult = await processFiles(rawFiles, baseConfig({ removeComments: false }), () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      // Worker path (removeComments=true → worker, but no comments in input → no change)
      const workerResult = await processFiles(rawFiles, baseConfig({ removeComments: true }), () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(workerResult[0].content).toBe(lightweightResult[0].content);
    });

    it('applies truncateBase64 and removeEmptyLines together (base64 replaced and surrounding blanks cleaned up)', async () => {
      // truncateBase64Content matches a single contiguous run of base64 chars (its regex does
      // not span newlines), so this asserts combined behavior — base64 collapsed to a placeholder
      // and the blank lines around it tidied — rather than a strict ordering invariant.
      const longBase64 =
        'DTJXfKHG6xA1Wn+kye4TOF2Cp8zxFjtgharP9Bk+Y4it0vccQWaLsNX6H0RpjrPY/SJHbJG22wAlSm+Uud4DKE1yl7zhBitQdZq/5AkuU3idwucMMVZ7oMXqDzRZfqPI7RI3XIGmy/AVOl+Eqc7zGD1ih6zR9htAZYqv1PkeQ2iNstf8IUZrkLXa/yRJbpO43QInTHGWu+AFKk90mb7jCC1Sd5zB5gswVXqfxOkOM1h9osfsETZbgKXK7xQ5XoOozfIXPGGGq9D1Gj9kia7T+B1CZ4yx1vsgRWqPtNn+I0htkrfcASZLcJW63wQpTnOYveIHLFF2m8DlCi9UeZ7D6A==';
      const files: ProcessedFile[] = [
        { path: 'test.js', content: `const a = 1;\n\nconst img = "${longBase64}";\n\nconst b = 2;` },
      ];
      const config = createMockConfig({
        output: { truncateBase64: true, removeEmptyLines: true },
      });

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      // The base64 should be truncated AND the blank lines around it should be cleaned up.
      expect(result[0].content).toContain('...');
      expect(result[0].content).not.toContain(longBase64);
      expect(result[0].content).not.toMatch(/\n\n/);
    });

    it('trim happens before showLineNumbers (so leading/trailing blanks do not get numbered)', () => {
      const files: ProcessedFile[] = [{ path: 'test.txt', content: '\n\nfoo\nbar\n\n' }];
      const config = createMockConfig({
        output: { showLineNumbers: true },
      });

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      // After trim, content is "foo\nbar" → line numbers should be just 1 and 2.
      expect(result[0].content).toBe('1: foo\n2: bar');
    });
  });
});
