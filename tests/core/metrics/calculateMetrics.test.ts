import { describe, expect, it, type Mock, vi } from 'vitest';
import type { ProcessedFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import { calculateFileMetrics } from '../../../src/core/metrics/calculateFileMetrics.js';
import { calculateMetrics, createMetricsTaskRunner } from '../../../src/core/metrics/calculateMetrics.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/shared/processConcurrency.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/shared/processConcurrency.js')>();
  return {
    ...original,
    initTaskRunner: vi.fn(() => ({
      run: vi.fn().mockResolvedValue(0),
      cleanup: vi.fn().mockResolvedValue(undefined),
    })),
  };
});
vi.mock('../../../src/core/metrics/TokenCounter.js', () => {
  return {
    TOKEN_ENCODINGS: ['o200k_base', 'cl100k_base', 'p50k_base', 'p50k_edit', 'r50k_base'],
    TokenCounter: vi.fn().mockImplementation(() => ({
      countTokens: vi.fn().mockReturnValue(10),
      free: vi.fn(),
    })),
  };
});
vi.mock('../../../src/core/metrics/aggregateMetrics.js');
vi.mock('../../../src/core/metrics/calculateFileMetrics.js', () => ({
  calculateFileMetrics: vi.fn(),
}));

describe('calculateMetrics', () => {
  it('should calculate metrics and return the result', async () => {
    const processedFiles: ProcessedFile[] = [
      { path: 'file1.txt', content: 'a'.repeat(100) },
      { path: 'file2.txt', content: 'b'.repeat(200) },
    ];
    const output = 'a'.repeat(300);
    const progressCallback: RepomixProgressCallback = vi.fn();

    const fileMetrics = [
      { path: 'file1.txt', charCount: 100, tokenCount: 10 },
      { path: 'file2.txt', charCount: 200, tokenCount: 20 },
    ];
    (calculateFileMetrics as unknown as Mock).mockResolvedValue(fileMetrics);

    const aggregatedResult = {
      totalFiles: 2,
      totalCharacters: 300,
      totalTokens: 30,
      fileCharCounts: {
        'file1.txt': 100,
        'file2.txt': 200,
      },
      fileTokenCounts: {
        'file1.txt': 10,
        'file2.txt': 20,
      },
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
    };

    const config = createMockConfig({ output: { parsableStyle: true } });

    const gitDiffResult: GitDiffResult | undefined = undefined;

    const mockTaskRunner = {
      run: vi.fn(),
      cleanup: vi.fn(),
    };

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      config,
      gitDiffResult,
      undefined,
      {
        calculateFileMetrics,
        calculateOutputMetrics: async () => 30,
        calculateGitDiffMetrics: () => Promise.resolve(0),
        calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
        taskRunner: mockTaskRunner,
      },
    );

    expect(progressCallback).toHaveBeenCalledWith('Calculating metrics...');
    expect(calculateFileMetrics).toHaveBeenCalledWith(
      processedFiles,
      ['file1.txt', 'file2.txt'],
      'o200k_base',
      progressCallback,
      expect.objectContaining({
        taskRunner: expect.any(Object),
      }),
    );
    expect(result).toEqual(aggregatedResult);
  });

  describe('output token fast path', () => {
    // These tests drive `calculateMetrics` end-to-end through the wrapper-
    // extraction fast path added in the previous commit. They exercise the
    // currently-file-local helpers `canUseFastOutputTokenPath` and
    // `extractOutputWrapper` through the public surface.

    const makeTaskRunner = (tokenForContent: (content: string) => number) => ({
      run: vi.fn(async (task: unknown): Promise<number | number[]> => {
        const t = task as { content?: string };
        return tokenForContent(t.content ?? '');
      }),
      cleanup: vi.fn(),
    });

    const runWithConfig = async (
      options: {
        processedFiles: ProcessedFile[];
        fileMetrics: { path: string; charCount: number; tokenCount: number }[];
        output: string;
        configOverrides?: Partial<{
          tokenCountTree: boolean | number;
          splitOutput: number | undefined;
          parsableStyle: boolean;
          style: 'xml' | 'markdown' | 'plain' | 'json';
        }>;
      },
      tokenForContent: (content: string) => number = () => 0,
    ) => {
      const config = createMockConfig();
      if (options.configOverrides) {
        Object.assign(config.output, options.configOverrides);
      }
      (calculateFileMetrics as unknown as Mock).mockResolvedValue(options.fileMetrics);

      const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(999);
      const taskRunner = makeTaskRunner(tokenForContent);

      const result = await calculateMetrics(
        options.processedFiles,
        Promise.resolve(options.output),
        vi.fn(),
        config,
        undefined,
        undefined,
        {
          calculateFileMetrics,
          calculateOutputMetrics: mockCalculateOutputMetrics,
          calculateGitDiffMetrics: () => Promise.resolve(0),
          calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
          taskRunner,
        },
      );

      return { result, mockCalculateOutputMetrics, taskRunner };
    };

    it('uses the wrapper fast path when tokenCountTree is enabled, summing per-file tokens plus wrapper tokens', async () => {
      const processedFiles: ProcessedFile[] = [
        { path: 'a.ts', content: 'const a = 1;' },
        { path: 'b.ts', content: 'const b = 2;' },
      ];
      const wrapper = '<files>\n<file path="a.ts">\n\n</file>\n<file path="b.ts">\n\n</file>\n</files>';
      // Construct the output so each file's content appears verbatim between
      // its wrapper markers.
      const output = `<files>\n<file path="a.ts">\n${processedFiles[0].content}\n</file>\n<file path="b.ts">\n${processedFiles[1].content}\n</file>\n</files>`;

      // Token counter: files already counted by selective (5 + 7). Wrapper gets
      // a stable mock value derived from its length so we can assert.
      const { result, mockCalculateOutputMetrics, taskRunner } = await runWithConfig(
        {
          processedFiles,
          fileMetrics: [
            { path: 'a.ts', charCount: 12, tokenCount: 5 },
            { path: 'b.ts', charCount: 12, tokenCount: 7 },
          ],
          output,
          configOverrides: { tokenCountTree: true, parsableStyle: false, style: 'xml' },
        },
        (content) => content.length,
      );

      // Fast path must NOT call calculateOutputMetrics (the slow path).
      expect(mockCalculateOutputMetrics).not.toHaveBeenCalled();
      // Exactly one worker call — for the wrapper.
      expect(taskRunner.run).toHaveBeenCalledTimes(1);
      const runArg = (taskRunner.run as unknown as Mock).mock.calls[0][0] as { content: string };
      expect(runArg.content).toBe(wrapper);
      // Result = per-file token sum (5 + 7 = 12) + wrapper length (mock tokens).
      expect(result.totalTokens).toBe(5 + 7 + wrapper.length);
    });

    it('still uses the wrapper fast path even when tokenCountTree is disabled', async () => {
      // The fast path reuses per-file token counts from calculateFileMetrics
      // (which always runs), so tokenCountTree has no bearing on eligibility.
      const processedFiles: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      const output = `<file path="a.ts">\n${processedFiles[0].content}\n</file>`;

      const { mockCalculateOutputMetrics, taskRunner } = await runWithConfig(
        {
          processedFiles,
          fileMetrics: [{ path: 'a.ts', charCount: 12, tokenCount: 5 }],
          output,
          configOverrides: { tokenCountTree: false, style: 'xml' },
        },
        (content) => content.length,
      );

      // Fast path is used — calculateOutputMetrics is NOT called.
      expect(mockCalculateOutputMetrics).not.toHaveBeenCalled();
      // One worker call for the wrapper.
      expect(taskRunner.run).toHaveBeenCalledTimes(1);
    });

    it('falls back when parsableStyle is true (content is XML-escaped)', async () => {
      const processedFiles: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = "x";' }];
      const output = `<file path="a.ts">content</file>`;

      const { mockCalculateOutputMetrics } = await runWithConfig({
        processedFiles,
        fileMetrics: [{ path: 'a.ts', charCount: 14, tokenCount: 5 }],
        output,
        configOverrides: { tokenCountTree: true, parsableStyle: true, style: 'xml' },
      });

      expect(mockCalculateOutputMetrics).toHaveBeenCalledTimes(1);
    });

    it('falls back for json style (JSON.stringify escapes content)', async () => {
      const processedFiles: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      const output = `{"files":{"a.ts":"const a = 1;"}}`;

      const { mockCalculateOutputMetrics } = await runWithConfig({
        processedFiles,
        fileMetrics: [{ path: 'a.ts', charCount: 12, tokenCount: 5 }],
        output,
        configOverrides: { tokenCountTree: true, style: 'json' },
      });

      expect(mockCalculateOutputMetrics).toHaveBeenCalledTimes(1);
    });

    it('falls back transparently when a file content is not found in the output', async () => {
      // The file content is not present verbatim in the output — the fast
      // path should fail extraction and defer to calculateOutputMetrics.
      const processedFiles: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      const output = '<file path="a.ts">\nconst b = 2;\n</file>';

      const { mockCalculateOutputMetrics, taskRunner } = await runWithConfig({
        processedFiles,
        fileMetrics: [{ path: 'a.ts', charCount: 12, tokenCount: 5 }],
        output,
        configOverrides: { tokenCountTree: true, style: 'xml' },
      });

      expect(mockCalculateOutputMetrics).toHaveBeenCalledTimes(1);
      expect(taskRunner.run).not.toHaveBeenCalled();
    });

    it('handles empty files in the middle of the file list', async () => {
      const processedFiles: ProcessedFile[] = [
        { path: 'a.ts', content: 'const a = 1;' },
        { path: 'empty.ts', content: '' },
        { path: 'b.ts', content: 'const b = 2;' },
      ];
      const output = `<file path="a.ts">\n${processedFiles[0].content}\n</file>\n<file path="empty.ts">\n\n</file>\n<file path="b.ts">\n${processedFiles[2].content}\n</file>`;

      const { result, taskRunner } = await runWithConfig(
        {
          processedFiles,
          fileMetrics: [
            { path: 'a.ts', charCount: 12, tokenCount: 5 },
            { path: 'empty.ts', charCount: 0, tokenCount: 0 },
            { path: 'b.ts', charCount: 12, tokenCount: 7 },
          ],
          output,
          configOverrides: { tokenCountTree: true, style: 'xml' },
        },
        (content) => content.length,
      );

      // Fast path engaged — exactly one worker call for the wrapper.
      expect(taskRunner.run).toHaveBeenCalledTimes(1);
      const runArg = (taskRunner.run as unknown as Mock).mock.calls[0][0] as { content: string };
      // Wrapper should not contain either non-empty file body.
      expect(runArg.content).not.toContain('const a = 1;');
      expect(runArg.content).not.toContain('const b = 2;');
      // Total = 5 (a) + 0 (empty) + 7 (b) + wrapper length.
      expect(result.totalTokens).toBe(5 + 0 + 7 + runArg.content.length);
    });

    it('correctly handles duplicate content where one file appears as a substring of another', async () => {
      // File A has the full block; file B's content is a substring of A's.
      // Monotonic cursor advance guarantees B is matched after A's end, not
      // at the false occurrence inside A.
      const processedFiles: ProcessedFile[] = [
        { path: 'a.ts', content: 'prefix-marker-suffix' },
        { path: 'b.ts', content: 'marker' },
      ];
      const output = `<file path="a.ts">\n${processedFiles[0].content}\n</file>\n<file path="b.ts">\n${processedFiles[1].content}\n</file>`;

      const { result, taskRunner } = await runWithConfig(
        {
          processedFiles,
          fileMetrics: [
            { path: 'a.ts', charCount: 20, tokenCount: 9 },
            { path: 'b.ts', charCount: 6, tokenCount: 2 },
          ],
          output,
          configOverrides: { tokenCountTree: true, style: 'xml' },
        },
        (content) => content.length,
      );

      expect(taskRunner.run).toHaveBeenCalledTimes(1);
      const runArg = (taskRunner.run as unknown as Mock).mock.calls[0][0] as { content: string };
      // Both file bodies must be sliced out of the wrapper, including the
      // full containing block of A. The leftover wrapper contains only the
      // tag scaffolding.
      expect(runArg.content).not.toContain('prefix-marker-suffix');
      expect(result.totalTokens).toBe(9 + 2 + runArg.content.length);
    });

    it('falls back for split output (multiple parts)', async () => {
      const processedFiles: ProcessedFile[] = [{ path: 'a.ts', content: 'const a = 1;' }];
      (calculateFileMetrics as unknown as Mock).mockResolvedValue([{ path: 'a.ts', charCount: 12, tokenCount: 5 }]);
      const config = createMockConfig();
      Object.assign(config.output, { tokenCountTree: true, style: 'xml' });

      const mockCalculateOutputMetrics = vi.fn().mockResolvedValue(42);
      const taskRunner = makeTaskRunner(() => 0);

      await calculateMetrics(
        processedFiles,
        Promise.resolve(['part1', 'part2']),
        vi.fn(),
        config,
        undefined,
        undefined,
        {
          calculateFileMetrics,
          calculateOutputMetrics: mockCalculateOutputMetrics,
          calculateGitDiffMetrics: () => Promise.resolve(0),
          calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
          taskRunner,
        },
      );

      // Split output: fast path is bypassed; calculateOutputMetrics is called
      // once per part.
      expect(mockCalculateOutputMetrics).toHaveBeenCalledTimes(2);
      expect(taskRunner.run).not.toHaveBeenCalled();
    });
  });
});

describe('createMetricsTaskRunner', () => {
  it('should return a taskRunner and warmupPromise', async () => {
    const result = createMetricsTaskRunner(100, 'o200k_base');

    expect(result).toHaveProperty('taskRunner');
    expect(result).toHaveProperty('warmupPromise');
    expect(result.taskRunner).toHaveProperty('run');
    expect(result.taskRunner).toHaveProperty('cleanup');

    // warmupPromise should resolve without error
    await expect(result.warmupPromise).resolves.toBeDefined();
  });

  it('should fire a warmup task with empty content', async () => {
    const result = createMetricsTaskRunner(50, 'cl100k_base');

    await result.warmupPromise;

    expect(result.taskRunner.run).toHaveBeenCalledWith({ content: '', encoding: 'cl100k_base' });
  });

  it('should swallow warmup task errors', async () => {
    const { initTaskRunner } = await import('../../../src/shared/processConcurrency.js');
    (initTaskRunner as Mock).mockReturnValueOnce({
      run: vi.fn().mockRejectedValue(new Error('init failed')),
      cleanup: vi.fn(),
    });

    const result = createMetricsTaskRunner(10, 'o200k_base');

    // warmupPromise should resolve (errors swallowed by .catch on each task)
    const resolved = await result.warmupPromise;
    expect(Array.isArray(resolved)).toBe(true);
    expect((resolved as number[]).every((v) => v === 0)).toBe(true);
  });
});
