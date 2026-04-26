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
});

describe('calculateMetrics fast/slow path equivalence', () => {
  // The fast path skips re-tokenizing the full output by summing per-file token counts
  // plus a wrapper-only tokenization. This test pins the invariant that matters most:
  //
  //   Σ(file tokens) + tokens(wrapper) === tokens(full output)
  //
  // We use a length-based token model (1 char = 1 "token") so the math is deterministic
  // and any drift in extractOutputWrapper or the fast-path summation surfaces immediately.
  const makeOutput = (header: string, files: ProcessedFile[], separator: string, footer: string): string =>
    header + files.map((f) => f.content).join(separator) + footer;

  const lengthBasedFileMetrics = async (files: ProcessedFile[]) =>
    files.map((f) => ({ path: f.path, charCount: f.content.length, tokenCount: f.content.length }));

  const lengthBasedOutputMetrics = async (output: string) => output.length;

  // taskRunner.run is invoked by runTokenCount for the wrapper string in the fast path.
  const lengthBasedTaskRunner = {
    run: vi.fn().mockImplementation(({ content }: { content: string }) => Promise.resolve(content.length)),
    cleanup: vi.fn(),
  };

  const sharedDeps = {
    calculateFileMetrics: lengthBasedFileMetrics,
    calculateOutputMetrics: lengthBasedOutputMetrics,
    calculateGitDiffMetrics: () => Promise.resolve(0),
    calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
    taskRunner: lengthBasedTaskRunner,
  };

  const processedFiles: ProcessedFile[] = [
    { path: 'a.ts', content: 'const a = 1;' },
    { path: 'b.ts', content: 'const longer = "more characters here";' },
    { path: 'c.ts', content: 'export {};' },
  ];
  const output = makeOutput('<header>\n', processedFiles, '\n---\n', '\n<footer>');

  it('fast path total equals slow path total for the same content', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();

    // Slow path: parsableStyle disables fast path
    const slowResult = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      createMockConfig({ output: { style: 'xml', parsableStyle: true } }),
      undefined,
      undefined,
      sharedDeps,
    );

    // Fast path: plain/markdown/xml without parsableStyle/splitOutput
    const fastResult = await calculateMetrics(
      processedFiles,
      Promise.resolve(output),
      progressCallback,
      createMockConfig({ output: { style: 'plain' } }),
      undefined,
      undefined,
      sharedDeps,
    );

    // The whole point of the fast path: same number, just computed differently.
    expect(fastResult.totalTokens).toBe(slowResult.totalTokens);
    expect(fastResult.totalTokens).toBe(output.length);
  });

  it('fast path falls back when file content cannot be located in output', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();
    // Output that does NOT contain the file contents verbatim (escaped, transformed, etc.)
    // forces extractOutputWrapper to return null and the slow path to take over.
    const escapedOutput = '<header>HTML-escaped content here<footer>';

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(escapedOutput),
      progressCallback,
      createMockConfig({ output: { style: 'plain' } }),
      undefined,
      undefined,
      sharedDeps,
    );

    // Slow path totals the full output rather than file contents.
    expect(result.totalTokens).toBe(escapedOutput.length);
  });

  it('slow path is used for split output even when style would otherwise qualify', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();
    const splitOutput = ['<part1>aaa', '<part2>bbb'];
    const expectedTotal = splitOutput.reduce((sum, part) => sum + part.length, 0);

    const result = await calculateMetrics(
      processedFiles,
      Promise.resolve(splitOutput),
      progressCallback,
      createMockConfig({ output: { style: 'plain', splitOutput: 2 } }),
      undefined,
      undefined,
      sharedDeps,
    );

    expect(result.totalTokens).toBe(expectedTotal);
  });

  it('cleans up the task runner when fileMetrics rejects', async () => {
    const progressCallback: RepomixProgressCallback = vi.fn();
    const failingTaskRunner = {
      run: vi.fn().mockResolvedValue(0),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    // No taskRunner in deps means calculateMetrics owns the lifecycle.
    // We need to mock initTaskRunner to return our spy so we can assert cleanup.
    // Reset first so the override is unambiguously consumed by THIS calculateMetrics
    // call, not silently picked up by an earlier test that omits taskRunner.
    const { initTaskRunner } = await import('../../../src/shared/processConcurrency.js');
    vi.mocked(initTaskRunner).mockReset();
    vi.mocked(initTaskRunner).mockReturnValueOnce(failingTaskRunner);

    await expect(
      calculateMetrics(
        processedFiles,
        Promise.resolve(output),
        progressCallback,
        createMockConfig({ output: { style: 'plain' } }),
        undefined,
        undefined,
        {
          calculateFileMetrics: async () => {
            throw new Error('file metrics failed');
          },
          calculateOutputMetrics: lengthBasedOutputMetrics,
          calculateGitDiffMetrics: () => Promise.resolve(0),
          calculateGitLogMetrics: () => Promise.resolve({ gitLogTokenCount: 0 }),
          // Intentionally omit taskRunner so calculateMetrics creates and owns one.
        },
      ),
    ).rejects.toThrow('file metrics failed');

    expect(failingTaskRunner.cleanup).toHaveBeenCalledTimes(1);
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
