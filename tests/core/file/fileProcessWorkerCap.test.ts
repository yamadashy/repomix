import os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import type { FileManipulator } from '../../../src/core/file/fileManipulate.js';
import { processFiles } from '../../../src/core/file/fileProcess.js';
import type { ProcessedFile, RawFile } from '../../../src/core/file/fileTypes.js';
import type { WorkerOptions } from '../../../src/shared/processConcurrency.js';
import { inlineInitTaskRunner } from '../../testing/taskRunnerDoubles.js';
import { createMockConfig } from '../../testing/testUtils.js';

// Compression goes through tree-sitter; stub it so this test only asserts the
// worker-cap sizing decision, not parser output.
vi.mock('../../../src/core/treeSitter/parseFile.js', () => ({
  parseFile: vi.fn(async (content: string) => content),
}));

const noopManipulator = (): FileManipulator | null => null;

/** Stub `process.versions.bun` and `os.availableParallelism` for `fn`, restoring both afterwards. */
async function withBun<T>(fn: () => Promise<T>): Promise<T> {
  const hadBun = Object.hasOwn(process.versions, 'bun');
  const original = process.versions.bun;
  Object.defineProperty(process.versions, 'bun', { value: '1.2.0', configurable: true });
  // Pin the CPU count so the cap assertion is deterministic regardless of the
  // runner's core count. With 18 cores, half-cores = 9, so the sqrt-based cap
  // (1 for one compressed file, 3 for 400) is the binding value in both tests.
  const parallelismSpy = vi.spyOn(os, 'availableParallelism').mockReturnValue(18);
  try {
    return await fn();
  } finally {
    parallelismSpy.mockRestore();
    if (hadBun) {
      Object.defineProperty(process.versions, 'bun', { value: original, configurable: true });
    } else {
      delete (process.versions as Record<string, unknown>).bun;
    }
  }
}

describe('processFiles worker cap (Bun, #2041)', () => {
  it('sizes the Bun worker cap by compressed-file count, not total file count', async () => {
    // 1 file needs compression, 300 are plain. The old code sized the cap from
    // all 301 files (ceil sqrt(301/75) = 3); it must use only the 1 compressed
    // file (ceil sqrt(1/75) = 1).
    const rawFiles: RawFile[] = [
      { path: 'docs/guide.md', content: 'guide', level: 'compress' },
      ...Array.from({ length: 300 }, (_, i) => ({
        path: `src/f${i}.ts`,
        content: `const x = ${i};`,
        level: 'full' as const,
      })),
    ];
    const config = createMockConfig({ output: { compress: false } });

    const seen: WorkerOptions[] = [];
    const recordingInitTaskRunner = <T, R>(options: WorkerOptions) => {
      seen.push(options);
      return inlineInitTaskRunner<T, R>(async (task: any) => ({ path: task.rawFile.path, content: task.rawFile.content }) as R)(options);
    };

    await withBun(() =>
      processFiles(rawFiles, config, () => {}, {
        initTaskRunner: recordingInitTaskRunner,
        getFileManipulator: noopManipulator,
      }),
    );

    expect(seen).toHaveLength(1);
    expect(seen[0].numOfTasks).toBe(301);
    // 1 compressed file -> sqrt(1/75) -> 1 worker, not sqrt(301/75) -> 3.
    expect(seen[0].maxWorkerThreads).toBe(1);
  });

  it('keeps the same cap as before when every file is compressed', async () => {
    // Global compression: compressed count equals total count, so the cap must
    // remain ceil sqrt(400/75) = 3 (cores = 18, half-cores = 9, not binding).
    const rawFiles: RawFile[] = Array.from({ length: 400 }, (_, i) => ({
      path: `src/f${i}.ts`,
      content: `const x = ${i};`,
      level: 'compress' as const,
    }));
    const config = createMockConfig({ output: { compress: true } });
    const seen: WorkerOptions[] = [];
    const recordingInitTaskRunner = <T, R>(options: WorkerOptions) => {
      seen.push(options);
      return inlineInitTaskRunner<T, R>(async (task: any) => ({ path: task.rawFile.path, content: task.rawFile.content }) as R)(options);
    };

    await withBun(() =>
      processFiles(rawFiles, config, () => {}, {
        initTaskRunner: recordingInitTaskRunner,
        getFileManipulator: noopManipulator,
      }),
    );

    expect(seen[0].maxWorkerThreads).toBe(3);
  });
});
