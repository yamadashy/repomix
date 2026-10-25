import { describe, expect, test, vi } from 'vitest';
import {
  createMcpProgressReporter,
  PROGRESS_THROTTLE_MS,
  withMcpProgress,
} from '../../../src/mcp/tools/mcpProgress.js';

const createCtx = (progressToken?: string | number) => {
  const notify = vi.fn().mockResolvedValue(undefined);
  return { ctx: { mcpReq: { _meta: progressToken === undefined ? {} : { progressToken }, notify } }, notify };
};

// A controllable clock so throttling is deterministic.
const createClock = () => {
  let time = 1000;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

const paramsOf = (notify: ReturnType<typeof vi.fn>) =>
  notify.mock.calls.map(([n]) => n.params as { progressToken: unknown; progress: number; message: string });

describe('createMcpProgressReporter', () => {
  test('returns undefined when the client sent no progressToken', () => {
    const { ctx, notify } = createCtx();
    expect(createMcpProgressReporter(ctx, { sandboxed: false })).toBeUndefined();
    expect(createMcpProgressReporter(undefined, { sandboxed: false })).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  test('sends notifications/progress with the token, a strictly increasing progress, and no total', () => {
    const { ctx, notify } = createCtx('t1');
    const clock = createClock();
    const report = createMcpProgressReporter(ctx, { sandboxed: false }, clock)?.report;

    report?.('Searching for files...');
    report?.('Collect file... (1/2) src/a.ts');
    clock.advance(PROGRESS_THROTTLE_MS);
    report?.('Collect file... (2/2) src/b.ts');
    report?.('Generating output...');

    expect(notify.mock.calls.every(([n]) => n.method === 'notifications/progress')).toBe(true);
    const params = paramsOf(notify);
    expect(params.map((p) => p.message)).toEqual([
      'Searching for files...',
      'Collect file... (1/2) src/a.ts',
      'Collect file... (2/2) src/b.ts',
      'Generating output...',
    ]);
    expect(params.map((p) => p.progress)).toEqual([1, 2, 3, 4]);
    expect(params.every((p) => p.progressToken === 't1' && !('total' in p))).toBe(true);
  });

  test('throttles repeats within a stage but always sends a stage change', () => {
    const { ctx, notify } = createCtx(7);
    const clock = createClock();
    const report = createMcpProgressReporter(ctx, { sandboxed: false }, clock)?.report;

    report?.('Processing file... (1/1000) a.ts');
    for (let i = 2; i <= 1000; i++) {
      clock.advance(1);
      report?.(`Processing file... (${i}/1000) a.ts`);
    }
    report?.('Calculating metrics...');

    const messages = paramsOf(notify).map((p) => p.message);
    // ~1s of updates at 1ms apart → about 1000 / PROGRESS_THROTTLE_MS + the stage change.
    expect(messages.length).toBeLessThanOrEqual(Math.ceil(1000 / PROGRESS_THROTTLE_MS) + 2);
    expect(messages[0]).toBe('Processing file... (1/1000) a.ts');
    expect(messages.at(-1)).toBe('Calculating metrics...');
  });

  test('throttles interleaved concurrent stages after their first message', () => {
    const { ctx, notify } = createCtx('t');
    const clock = createClock();
    const report = createMcpProgressReporter(ctx, { sandboxed: false }, clock)?.report;

    // Security check and file processing run concurrently and alternate messages.
    for (let i = 1; i <= 500; i++) {
      clock.advance(1);
      report?.(`Processing file... (${i}/500) a.ts`);
      report?.(`Running security check... (${i}/500) a.ts`);
    }

    const messages = paramsOf(notify).map((p) => p.message);
    expect(messages.slice(0, 2)).toEqual(['Processing file... (1/500) a.ts', 'Running security check... (1/500) a.ts']);
    // First and final message of each of the two stages, plus throttled updates in between.
    expect(messages.length).toBeLessThanOrEqual(Math.ceil(500 / PROGRESS_THROTTLE_MS) + 4);
  });

  test('always sends the final "(n/n)" message of a stage even within the throttle window', () => {
    const { ctx, notify } = createCtx('t');
    const clock = createClock();
    const report = createMcpProgressReporter(ctx, { sandboxed: false }, clock)?.report;

    for (let i = 1; i <= 100; i++) {
      report?.(`Collect file... (${i}/100) a.ts`);
    }

    expect(paramsOf(notify).map((p) => p.message)).toEqual([
      'Collect file... (1/100) a.ts',
      'Collect file... (100/100) a.ts',
    ]);
  });

  test('throttles messages without a stage head together', () => {
    const { ctx, notify } = createCtx('t');
    const clock = createClock();
    const report = createMcpProgressReporter(ctx, { sandboxed: false }, clock)?.report;

    for (let i = 1; i <= 100; i++) {
      report?.(`/abs/path/file-${i}.ts`);
    }

    expect(paramsOf(notify).map((p) => p.message)).toEqual(['/abs/path/file-1.ts']);
  });

  test('strips ANSI color codes from messages', () => {
    const { ctx, notify } = createCtx('t');
    const report = createMcpProgressReporter(ctx, { sandboxed: false })?.report;
    report?.('Processing file... (1/1) \u001b[2msrc/a.ts\u001b[22m');
    expect(paramsOf(notify)[0].message).toBe('Processing file... (1/1) src/a.ts');
  });

  test('sandbox mode reduces messages to the stage and a numeric counter', () => {
    const { ctx, notify } = createCtx('t');
    const clock = createClock();
    const report = createMcpProgressReporter(ctx, { sandboxed: true }, clock)?.report;
    report?.('Processing file... (3/10) /home/user/project/src/a.ts');
    report?.('Generating output... (part 2) evaluating /home/user/project/src');
    report?.('/home/user/project leaked without a stage');
    report?.('Calculating metrics...');
    expect(paramsOf(notify).map((p) => p.message)).toEqual([
      'Processing file... (3/10)',
      'Generating output...',
      'Packing...',
      'Calculating metrics...',
    ]);
  });

  test('a rejected notify never throws or rejects into the pipeline', async () => {
    const notify = vi.fn().mockRejectedValue(new Error('transport closed'));
    const report = createMcpProgressReporter(
      { mcpReq: { _meta: { progressToken: 't' }, notify } },
      { sandboxed: false },
    )?.report;
    expect(() => report?.('Searching for files...')).not.toThrow();
    // Let the rejection settle; an unhandled rejection would fail the test run.
    await new Promise((resolve) => setImmediate(resolve));
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test('a synchronously throwing notify is swallowed', () => {
    const notify = vi.fn(() => {
      throw new Error('boom');
    });
    const report = createMcpProgressReporter(
      { mcpReq: { _meta: { progressToken: 't' }, notify } },
      { sandboxed: false },
    )?.report;
    expect(() => report?.('Searching for files...')).not.toThrow();
  });

  test('stop() silences the reporter so nothing follows the response', () => {
    const { ctx, notify } = createCtx('t');
    const reporter = createMcpProgressReporter(ctx, { sandboxed: false });

    reporter?.report('Searching for files...');
    reporter?.stop();
    reporter?.report('Running security check...');

    expect(paramsOf(notify).map((p) => p.message)).toEqual(['Searching for files...']);
  });
});

test('sends nothing once the request signal has aborted', () => {
  const controller = new AbortController();
  const notify = vi.fn().mockResolvedValue(undefined);
  const ctx = { mcpReq: { _meta: { progressToken: 't' }, notify, signal: controller.signal } };
  const reporter = createMcpProgressReporter(ctx, { sandboxed: false });

  reporter?.report('Searching for files...');
  controller.abort();
  reporter?.report('Running security check...');

  expect(paramsOf(notify).map((p) => p.message)).toEqual(['Searching for files...']);
});

describe('withMcpProgress', () => {
  test('passes the reporter to the run and stops it once the run resolves', async () => {
    const { ctx, notify } = createCtx('t');
    let lateReport: ((message: string) => void) | undefined;

    const result = await withMcpProgress(ctx, { sandboxed: false }, async (progressCallback) => {
      lateReport = progressCallback as (message: string) => void;
      progressCallback?.('Searching for files...');
      return 'done';
    });
    lateReport?.('Running security check...');

    expect(result).toBe('done');
    expect(paramsOf(notify).map((p) => p.message)).toEqual(['Searching for files...']);
  });

  test('stops the reporter when the run rejects, so a still-running stage cannot report late', async () => {
    const { ctx, notify } = createCtx('t');
    let lateReport: ((message: string) => void) | undefined;

    await expect(
      withMcpProgress(ctx, { sandboxed: false }, async (progressCallback) => {
        lateReport = progressCallback as (message: string) => void;
        throw new Error('comment removal failed');
      }),
    ).rejects.toThrow('comment removal failed');
    lateReport?.('Running security check... (5/10)');

    expect(notify).not.toHaveBeenCalled();
  });

  test('passes no callback when the client sent no progressToken', async () => {
    const { ctx } = createCtx();
    const run = vi.fn(async () => 'done');

    await withMcpProgress(ctx, { sandboxed: false }, run);

    expect(run).toHaveBeenCalledWith(undefined);
  });
});
