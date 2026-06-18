import pc from 'picocolors';
import { describe, expect, it, vi } from 'vitest';
import type { RawFile } from '../../../src/core/file/fileTypes.js';
import type { GitDiffResult } from '../../../src/core/git/gitDiffHandle.js';
import type { GitLogResult } from '../../../src/core/git/gitLogHandle.js';
import { SECURITY_CHECK_BATCH_SIZE, type SecurityTaskRunner } from '../../../src/core/security/securityCheck.js';
import { createSecurityCheckStream } from '../../../src/core/security/securityCheckStreaming.js';
import type {
  SecurityCheckItem,
  SecurityCheckTask,
  SuspiciousFileResult,
} from '../../../src/core/security/workers/securityCheckWorker.js';

vi.mock('../../../src/shared/logger');

const fileItem = (index: number): SecurityCheckItem => ({
  filePath: `file${index}.js`,
  content: `console.log(${index});`,
  type: 'file',
});

const rawFileOf = (item: SecurityCheckItem): RawFile => ({ path: item.filePath, content: item.content });

// Task runner that records dispatched batches and flags every item whose path
// is in `suspiciousPaths`.
const createMockTaskRunner = (suspiciousPaths: Set<string> = new Set()) => {
  const dispatchedBatches: SecurityCheckItem[][] = [];
  const run = vi.fn(async (task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
    dispatchedBatches.push(task.items);
    return task.items.map((item) =>
      suspiciousPaths.has(item.filePath)
        ? { filePath: item.filePath, messages: ['found a secret'], type: item.type }
        : null,
    );
  });
  const taskRunner: SecurityTaskRunner = { run, cleanup: async () => {} };
  return { taskRunner, dispatchedBatches, run };
};

describe('createSecurityCheckStream', () => {
  it('should dispatch a full batch as soon as it is buffered, before finalize', () => {
    const { taskRunner, run } = createMockTaskRunner();
    const stream = createSecurityCheckStream(taskRunner);

    for (let i = 0; i < SECURITY_CHECK_BATCH_SIZE - 1; i++) {
      stream.addFile(fileItem(i));
    }
    expect(run).not.toHaveBeenCalled();

    stream.addFile(fileItem(SECURITY_CHECK_BATCH_SIZE - 1));
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].items).toHaveLength(SECURITY_CHECK_BATCH_SIZE);
  });

  it('should produce the same batch sizes as runSecurityCheck (full batches plus remainder)', async () => {
    const { taskRunner, dispatchedBatches } = createMockTaskRunner();
    const stream = createSecurityCheckStream(taskRunner);

    const items = Array.from({ length: SECURITY_CHECK_BATCH_SIZE * 2 + 10 }, (_, i) => fileItem(i));
    for (const item of items) {
      stream.addFile(item);
    }

    await stream.finalize(items.map(rawFileOf));

    expect(dispatchedBatches.map((batch) => batch.length)).toEqual([
      SECURITY_CHECK_BATCH_SIZE,
      SECURITY_CHECK_BATCH_SIZE,
      10,
    ]);
  });

  it('should check raw files that were never streamed (safety net for custom collectFiles)', async () => {
    const suspicious = new Set(['unstreamed.js']);
    const { taskRunner, dispatchedBatches } = createMockTaskRunner(suspicious);
    const stream = createSecurityCheckStream(taskRunner);

    const rawFiles: RawFile[] = [
      { path: 'streamed.js', content: 'a' },
      { path: 'unstreamed.js', content: 'b' },
    ];
    stream.addFile({ filePath: 'streamed.js', content: 'a', type: 'file' });

    const results = await stream.finalize(rawFiles);

    const allDispatchedPaths = dispatchedBatches.flat().map((item) => item.filePath);
    expect(allDispatchedPaths).toContain('unstreamed.js');
    expect(results).toEqual([{ filePath: 'unstreamed.js', messages: ['found a secret'], type: 'file' }]);
  });

  it('should not re-dispatch files already streamed via addFile', async () => {
    const { taskRunner, dispatchedBatches } = createMockTaskRunner();
    const stream = createSecurityCheckStream(taskRunner);

    const items = [fileItem(0), fileItem(1)];
    for (const item of items) {
      stream.addFile(item);
    }

    await stream.finalize(items.map(rawFileOf));

    expect(dispatchedBatches.flat()).toHaveLength(2);
  });

  it('should append git diff and git log items like runSecurityCheck', async () => {
    const { taskRunner, dispatchedBatches } = createMockTaskRunner();
    const stream = createSecurityCheckStream(taskRunner);

    const gitDiffResult: GitDiffResult = {
      workTreeDiffContent: 'worktree diff',
      stagedDiffContent: 'staged diff',
    };
    const gitLogResult: GitLogResult = {
      logContent: 'log content',
      commits: [],
    };

    stream.addFile(fileItem(0));
    await stream.finalize([rawFileOf(fileItem(0))], () => {}, gitDiffResult, gitLogResult);

    expect(dispatchedBatches.flat()).toEqual([
      fileItem(0),
      { filePath: 'Working tree changes', content: 'worktree diff', type: 'gitDiff' },
      { filePath: 'Staged changes', content: 'staged diff', type: 'gitDiff' },
      { filePath: 'Git log history', content: 'log content', type: 'gitLog' },
    ]);
  });

  it('should return suspicious file results in rawFiles order even when streamed out of order', async () => {
    const suspicious = new Set(['file0.js', 'file2.js']);
    const { taskRunner } = createMockTaskRunner(suspicious);
    const stream = createSecurityCheckStream(taskRunner);

    const items = [fileItem(0), fileItem(1), fileItem(2)];
    // Simulate completion order differing from canonical order
    stream.addFile(items[2]);
    stream.addFile(items[0]);
    stream.addFile(items[1]);

    const results = await stream.finalize(items.map(rawFileOf));

    expect(results.map((result) => result.filePath)).toEqual(['file0.js', 'file2.js']);
  });

  it('should order results as files, then gitDiff, then gitLog', async () => {
    const suspicious = new Set(['file0.js', 'Working tree changes', 'Git log history']);
    const { taskRunner } = createMockTaskRunner(suspicious);
    const stream = createSecurityCheckStream(taskRunner);

    const gitDiffResult: GitDiffResult = { workTreeDiffContent: 'worktree diff', stagedDiffContent: '' };
    const gitLogResult: GitLogResult = { logContent: 'log content', commits: [] };

    const results = await stream.finalize([{ path: 'file0.js', content: 'a' }], () => {}, gitDiffResult, gitLogResult);

    expect(results.map((result) => [result.filePath, result.type])).toEqual([
      ['file0.js', 'file'],
      ['Working tree changes', 'gitDiff'],
      ['Git log history', 'gitLog'],
    ]);
  });

  it('should return an empty array without dispatching when there is nothing to check', async () => {
    const { taskRunner, run } = createMockTaskRunner();
    const stream = createSecurityCheckStream(taskRunner);

    const results = await stream.finalize([]);

    expect(results).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('should reject finalize when a batch fails, including batches dispatched before finalize', async () => {
    const error = new Error('worker failed');
    const run = vi.fn(async (_task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
      throw error;
    });
    const taskRunner: SecurityTaskRunner = { run, cleanup: async () => {} };
    const stream = createSecurityCheckStream(taskRunner);

    const items = Array.from({ length: SECURITY_CHECK_BATCH_SIZE }, (_, i) => fileItem(i));
    for (const item of items) {
      stream.addFile(item);
    }
    // The pre-finalize batch failure must not surface as an unhandled rejection
    await new Promise((resolve) => setImmediate(resolve));

    await expect(stream.finalize(items.map(rawFileOf))).rejects.toThrow('worker failed');
  });

  it('should report progress with true totals for batches completing after finalize', async () => {
    let releaseBatch: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseBatch = resolve;
    });
    const run = vi.fn(async (task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
      await gate;
      return task.items.map(() => null);
    });
    const taskRunner: SecurityTaskRunner = { run, cleanup: async () => {} };
    const stream = createSecurityCheckStream(taskRunner);
    const progressCallback = vi.fn();

    const items = Array.from({ length: SECURITY_CHECK_BATCH_SIZE }, (_, i) => fileItem(i));
    for (const item of items) {
      stream.addFile(item);
    }

    const finalizePromise = stream.finalize(items.map(rawFileOf), progressCallback);
    releaseBatch?.();
    await finalizePromise;

    const lastPath = items[items.length - 1].filePath;
    expect(progressCallback).toHaveBeenCalledWith(
      expect.stringContaining(
        `Running security check... (${SECURITY_CHECK_BATCH_SIZE}/${SECURITY_CHECK_BATCH_SIZE}) ${pc.dim(lastPath)}`,
      ),
    );
  });
});
