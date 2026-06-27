import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileInclusionLevel } from '../../../src/core/file/fileLevelResolve.js';
import type { FileManipulator } from '../../../src/core/file/fileManipulate.js';
import { applyLightweightTransforms, processFiles } from '../../../src/core/file/fileProcess.js';
import type { ProcessedFile, RawFile } from '../../../src/core/file/fileTypes.js';
import type { FileProcessTask } from '../../../src/core/file/workers/fileProcessWorker.js';
import fileProcessWorker from '../../../src/core/file/workers/fileProcessWorker.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import { createMockConfig } from '../../testing/testUtils.js';

// parseFile is the Tree-sitter compression entry point. Mock it so these tests
// assert routing/decisions (which files get compressed) without depending on
// the exact compressed output of the real parser.
vi.mock('../../../src/core/treeSitter/parseFile.js');
vi.mock('../../../src/shared/logger.js');

const mockGetFileManipulator = (_filePath: string): FileManipulator | null => null;

const mockInitTaskRunner = <T, R>(_options: WorkerOptions) => {
  return {
    run: async (task: T) => {
      return (await fileProcessWorker(task as FileProcessTask)) as R;
    },
    cleanup: async () => {
      // no-op for tests
    },
  };
};

const byPath = (files: ProcessedFile[]): Record<string, string> =>
  Object.fromEntries(files.map((f) => [f.path, f.content]));

describe('fileProcess inclusion levels (output.patterns)', () => {
  beforeEach(() => {
    vi.mocked(parseFile).mockResolvedValue('<<compressed>>');
  });

  describe('processFiles', () => {
    it('excludes directory-only files from the content output while keeping other files', async () => {
      const rawFiles: RawFile[] = [
        { path: 'src/index.ts', content: 'const a = 1;' },
        { path: 'website/index.html', content: '<html></html>' },
      ];
      const config = createMockConfig({
        output: { patterns: [{ pattern: 'website/**/*', directoryStructureOnly: true }] },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result.map((f) => f.path)).toEqual(['src/index.ts']);
    });

    it('compresses files matched by a compress pattern even when global compress is off', async () => {
      const rawFiles: RawFile[] = [
        { path: 'docs/guide.md', content: 'real docs content' },
        { path: 'src/index.ts', content: 'const a = 1;' },
      ];
      const config = createMockConfig({
        output: { compress: false, patterns: [{ pattern: 'docs/**/*', compress: true }] },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      const content = byPath(result);
      expect(content['docs/guide.md']).toBe('<<compressed>>');
      expect(content['src/index.ts']).toBe('const a = 1;');
    });

    it('keeps full content for a pattern that overrides a global compress, while still compressing others', async () => {
      const rawFiles: RawFile[] = [
        { path: 'src/index.ts', content: 'const a = 1;' },
        { path: 'lib/util.ts', content: 'const b = 2;' },
      ];
      const config = createMockConfig({
        output: { compress: true, patterns: [{ pattern: 'src/**/*', compress: false }] },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      const content = byPath(result);
      expect(content['src/index.ts']).toBe('const a = 1;');
      expect(content['lib/util.ts']).toBe('<<compressed>>');
    });

    it('handles compress and directory-only patterns together (compress, exclude, keep full)', async () => {
      const rawFiles: RawFile[] = [
        { path: 'src/index.ts', content: 'const a = 1;' },
        { path: 'docs/guide.md', content: 'real docs content' },
        { path: 'website/index.html', content: '<html></html>' },
      ];
      const config = createMockConfig({
        output: {
          compress: false,
          patterns: [
            { pattern: 'docs/**/*', compress: true },
            { pattern: 'website/**/*', directoryStructureOnly: true },
          ],
        },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      const content = byPath(result);
      expect(Object.keys(content).sort()).toEqual(['docs/guide.md', 'src/index.ts']);
      expect(content['docs/guide.md']).toBe('<<compressed>>');
      expect(content['src/index.ts']).toBe('const a = 1;');
    });

    it('does not compress when global compress is off and no pattern matches', async () => {
      const rawFiles: RawFile[] = [{ path: 'src/index.ts', content: 'const a = 1;' }];
      const config = createMockConfig({
        output: { compress: false, patterns: [{ pattern: 'docs/**/*', compress: true }] },
      });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(byPath(result)['src/index.ts']).toBe('const a = 1;');
    });

    // The packager resolves the inclusion level against each file's
    // per-root-relative path (the basis include/ignore use) and threads it on
    // rawFile.level before rewriting path to its display form. processFiles must
    // honor that threaded level rather than re-deriving it from the display path,
    // which is what makes output.patterns match per-root for multiple roots and
    // for output.filePathStyle: 'cwd-relative'.
    it('honors a precomputed directory-only level threaded on rawFile.level over the path-derived level', async () => {
      // No output.patterns are configured, so resolving from the (display) path
      // alone would yield 'full'. The threaded 'directory-only' level must win and
      // drop the file from the content output.
      const rawFiles: RawFile[] = [
        { path: 'app/src/index.ts', content: 'const a = 1;', level: 'directory-only' },
        { path: 'app/README.md', content: '# app', level: 'full' },
      ];
      const config = createMockConfig({ output: {} });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result.map((f) => f.path)).toEqual(['app/README.md']);
    });

    it('honors a precomputed compress level threaded on rawFile.level over the path-derived level', async () => {
      // Global compress is off and no pattern matches, so the path-derived level
      // would be 'full'. The threaded 'compress' level must route the file through
      // the compression pipeline (worker path).
      const rawFiles: RawFile[] = [{ path: 'app/src/index.ts', content: 'const a = 1;', level: 'compress' }];
      const config = createMockConfig({ output: { compress: false } });

      const result = await processFiles(rawFiles, config, () => {}, {
        initTaskRunner: mockInitTaskRunner,
        getFileManipulator: mockGetFileManipulator,
      });

      expect(byPath(result)['app/src/index.ts']).toBe('<<compressed>>');
    });
  });

  describe('applyLightweightTransforms', () => {
    it('does not add line numbers to a file compressed via an output pattern', () => {
      const files: ProcessedFile[] = [{ path: 'docs/guide.md', content: 'Line 1\nLine 2' }];
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
          compress: false,
          patterns: [{ pattern: 'docs/**/*', compress: true }],
        },
      });

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'docs/guide.md', content: 'Line 1\nLine 2' }]);
    });

    it('still adds line numbers to files not matched by a compress pattern', () => {
      const files: ProcessedFile[] = [{ path: 'src/index.ts', content: 'Line 1\nLine 2' }];
      const config = createMockConfig({
        output: {
          showLineNumbers: true,
          compress: false,
          patterns: [{ pattern: 'docs/**/*', compress: true }],
        },
      });

      const result = applyLightweightTransforms(files, config, () => {}, {
        getFileManipulator: mockGetFileManipulator,
      });

      expect(result).toEqual([{ path: 'src/index.ts', content: '1: Line 1\n2: Line 2' }]);
    });

    it('consults a provided fileLevels map instead of recomputing the level', () => {
      // The file resolves to 'full' on its own (no patterns), but the precomputed
      // map marks it 'compress', so line numbers must be suppressed. This proves the
      // map is consulted rather than resolveFileLevel being called again.
      const files: ProcessedFile[] = [{ path: 'src/index.ts', content: 'Line 1\nLine 2' }];
      const config = createMockConfig({ output: { showLineNumbers: true } });
      const fileLevels = new Map<string, FileInclusionLevel>([['src/index.ts', 'compress']]);

      const result = applyLightweightTransforms(
        files,
        config,
        () => {},
        { getFileManipulator: mockGetFileManipulator },
        fileLevels,
      );

      expect(result).toEqual([{ path: 'src/index.ts', content: 'Line 1\nLine 2' }]);
    });
  });
});
