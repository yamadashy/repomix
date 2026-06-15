import path from 'node:path';
import type { ChokidarOptions } from 'chokidar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DefaultActionRunnerResult } from '../../../src/cli/actions/defaultAction.js';
import { runWatchAction } from '../../../src/cli/actions/watchAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/shared/logger', () => ({
  logger: {
    log: vi.fn(),
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type FakeWatcherListener = ((eventName: string, filePath: string) => void) | ((error: Error) => void);

class FakeWatcher {
  private listeners = new Map<'all' | 'error', FakeWatcherListener[]>();
  add = vi.fn();
  close = vi.fn(async () => {});

  on(eventName: 'all', listener: (eventName: string, filePath: string) => void): this;
  on(eventName: 'error', listener: (error: Error) => void): this;
  on(eventName: 'all' | 'error', listener: FakeWatcherListener): this {
    const eventListeners = this.listeners.get(eventName) ?? [];
    eventListeners.push(listener);
    this.listeners.set(eventName, eventListeners);
    return this;
  }

  emit(eventName: 'all', event: string, filePath: string): boolean;
  emit(eventName: 'error', error: Error): boolean;
  emit(eventName: 'all' | 'error', ...args: [string, string] | [Error]): boolean {
    const eventListeners = this.listeners.get(eventName) ?? [];
    for (const listener of eventListeners) {
      if (eventName === 'all') {
        (listener as (event: string, filePath: string) => void)(args[0] as string, args[1] as string);
      } else {
        (listener as (error: Error) => void)(args[0] as Error);
      }
    }
    return eventListeners.length > 0;
  }
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createResult = (overrides: Parameters<typeof createMockConfig>[0] = {}): DefaultActionRunnerResult => {
  const config = createMockConfig({
    cwd: '/repo',
    output: {
      filePath: 'repomix-output.xml',
      style: 'xml',
      parsableStyle: false,
      fileSummary: true,
      directoryStructure: true,
      topFilesLength: 5,
      showLineNumbers: false,
      removeComments: false,
      removeEmptyLines: false,
      compress: false,
      copyToClipboard: false,
      files: true,
      git: {
        sortByChanges: true,
        sortByChangesMaxCommits: 100,
        includeDiffs: false,
      },
    },
    ...overrides,
  });

  return {
    config,
    packResult: {
      totalFiles: 1,
      totalCharacters: 10,
      totalTokens: 5,
      fileCharCounts: {},
      fileTokenCounts: {},
      gitDiffTokenCount: 0,
      gitLogTokenCount: 0,
      outputFiles: ['repomix-output.xml'],
      suspiciousFilesResults: [],
      suspiciousGitDiffResults: [],
      suspiciousGitLogResults: [],
      processedFiles: [],
      safeFilePaths: [],
      skippedFiles: [],
    },
  };
};

describe('watchAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setup = (options: CliOptions = {}, runDefaultAction = vi.fn(async () => createResult())) => {
    const fakeWatcher = new FakeWatcher();
    let stopWatching!: () => void;
    const stopPromise = new Promise<void>((resolve) => {
      stopWatching = resolve;
    });
    const createWatcher = vi.fn((_paths: string[], _options: ChokidarOptions) => fakeWatcher);

    const runPromise = runWatchAction(
      ['src'],
      '/repo',
      { watch: true, ...options },
      {
        runDefaultAction,
        createWatcher,
        waitForStop: async () => stopPromise,
        debounceMs: 300,
      },
    );

    return { fakeWatcher, stopWatching, runPromise, runDefaultAction, createWatcher };
  };

  it('runs an initial build and starts watching local directories', async () => {
    const { runDefaultAction, createWatcher, stopWatching, runPromise } = setup();

    await flushPromises();

    expect(runDefaultAction).toHaveBeenCalledTimes(1);
    expect(runDefaultAction).toHaveBeenCalledWith(['src'], '/repo', expect.objectContaining({ watch: true }));
    expect(createWatcher).toHaveBeenCalledWith(
      expect.arrayContaining([path.resolve('/repo', 'src')]),
      expect.objectContaining({
        ignoreInitial: true,
        persistent: true,
      }),
    );

    stopWatching();
    await runPromise;
  });

  it('debounces file changes before rebuilding', async () => {
    const { fakeWatcher, runDefaultAction, stopWatching, runPromise } = setup();
    await flushPromises();

    fakeWatcher.emit('all', 'change', path.resolve('/repo/src/index.ts'));
    await vi.advanceTimersByTimeAsync(299);
    expect(runDefaultAction).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(runDefaultAction).toHaveBeenCalledTimes(2);

    stopWatching();
    await runPromise;
  });

  it('ignores generated output files and noisy dependency directories', async () => {
    const { createWatcher, stopWatching, runPromise } = setup();
    await flushPromises();

    const options = createWatcher.mock.calls[0][1];
    const ignored = options.ignored as (filePath: string) => boolean;

    expect(ignored(path.resolve('/repo/repomix-output.xml'))).toBe(true);
    expect(ignored(path.resolve('/repo/node_modules/pkg/index.js'))).toBe(true);
    expect(ignored(path.resolve('/repo/src/index.ts'))).toBe(false);

    stopWatching();
    await runPromise;
  });

  it('watches instruction file paths from the active config', async () => {
    const runDefaultAction = vi.fn(async () =>
      createResult({
        output: {
          instructionFilePath: 'docs/instructions.md',
        },
      }),
    );

    const { createWatcher, stopWatching, runPromise } = setup({}, runDefaultAction);
    await flushPromises();

    expect(createWatcher).toHaveBeenCalledWith(
      expect.arrayContaining([path.resolve('/repo/docs/instructions.md')]),
      expect.any(Object),
    );

    stopWatching();
    await runPromise;
  });

  it('coalesces changes that arrive while a rebuild is running', async () => {
    const fakeWatcher = new FakeWatcher();
    let stopWatching!: () => void;
    const stopPromise = new Promise<void>((resolve) => {
      stopWatching = resolve;
    });
    let finishSecondBuild!: () => void;
    const secondBuild = new Promise<DefaultActionRunnerResult>((resolve) => {
      finishSecondBuild = () => resolve(createResult());
    });
    const runDefaultAction = vi
      .fn()
      .mockResolvedValueOnce(createResult())
      .mockReturnValueOnce(secondBuild)
      .mockResolvedValue(createResult());

    const runPromise = runWatchAction(
      ['src'],
      '/repo',
      { watch: true },
      {
        runDefaultAction,
        createWatcher: vi.fn(() => fakeWatcher),
        waitForStop: async () => stopPromise,
        debounceMs: 300,
      },
    );

    await flushPromises();
    fakeWatcher.emit('all', 'change', path.resolve('/repo/src/first.ts'));
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(runDefaultAction).toHaveBeenCalledTimes(2);

    fakeWatcher.emit('all', 'change', path.resolve('/repo/src/second.ts'));
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(runDefaultAction).toHaveBeenCalledTimes(2);

    finishSecondBuild();
    await flushPromises();
    expect(runDefaultAction).toHaveBeenCalledTimes(3);

    stopWatching();
    await runPromise;
  });

  it('keeps watching after a rebuild fails', async () => {
    const fakeWatcher = new FakeWatcher();
    let stopWatching!: () => void;
    const stopPromise = new Promise<void>((resolve) => {
      stopWatching = resolve;
    });
    const runDefaultAction = vi
      .fn()
      .mockRejectedValueOnce(new Error('first build failed'))
      .mockResolvedValue(createResult());

    const runPromise = runWatchAction(
      ['src'],
      '/repo',
      { watch: true },
      {
        runDefaultAction,
        createWatcher: vi.fn(() => fakeWatcher),
        waitForStop: async () => stopPromise,
        debounceMs: 300,
      },
    );

    await flushPromises();
    fakeWatcher.emit('all', 'change', path.resolve('/repo/src/index.ts'));
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(runDefaultAction).toHaveBeenCalledTimes(2);

    stopWatching();
    await runPromise;
  });

  it.each([
    [{ stdin: true }, '--watch cannot be used with --stdin'],
    [{ stdout: true }, '--watch cannot be used with --stdout'],
    [{ output: '-' }, '--watch cannot be used with --stdout'],
    [{ copy: true }, '--watch cannot be used with --copy'],
    [{ skillGenerate: true }, '--watch cannot be used with --skill-generate'],
  ] as const)('rejects unsupported option combination %j', async (options, expectedMessage) => {
    await expect(
      runWatchAction(
        ['.'],
        '/repo',
        { watch: true, ...options },
        {
          runDefaultAction: vi.fn(),
          createWatcher: vi.fn(),
          waitForStop: vi.fn(),
          debounceMs: 300,
        },
      ),
    ).rejects.toThrow(expectedMessage);
  });
});
