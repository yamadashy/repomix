import { EventEmitter } from 'node:events';
import path from 'node:path';
import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WatchDeps } from '../../../src/cli/actions/watchAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import type { PackResult } from '../../../src/core/packager.js';
import { logger } from '../../../src/shared/logger.js';
import { createMockSpinner } from '../../testing/cliDoubles.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';
import { createManualClock } from '../../testing/manualClock.js';
import { createMockConfig } from '../../testing/testUtils.js';

function createMockPackResult(overrides: Partial<PackResult> = {}): PackResult {
  return {
    totalFiles: 5,
    totalCharacters: 500,
    totalTokens: 100,
    fileCharCounts: {},
    fileTokenCounts: {},
    suspiciousFilesResults: [],
    suspiciousGitDiffResults: [],
    suspiciousGitLogResults: [],
    processedFiles: [],
    safeFilePaths: ['src/index.ts', 'src/utils.ts'],
    gitDiffTokenCount: 0,
    gitLogTokenCount: 0,
    skippedFiles: [],
    ...overrides,
  };
}

function createMockWatcher() {
  const emitter = new EventEmitter();
  let markStarted: () => void = () => {};
  // Resolves once runWatchAction has finished the initial pack and created the watcher.
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const watcher = Object.assign(emitter, {
    started,
    markStarted,
    close: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    unwatch: vi.fn(),
    getWatched: vi.fn().mockReturnValue({}),
    closed: false,
  });
  return watcher;
}

function createMockWatch(watcher: ReturnType<typeof createMockWatcher>): WatchDeps['watch'] {
  return vi.fn(() => {
    watcher.markStarted();
    return watcher;
  }) as unknown as WatchDeps['watch'];
}

// Stub the ignore filter in flow tests so they never read .gitignore from disk.
// The real builder is covered by the buildWatchIgnoreFilter unit tests.
const noopBuildIgnoreFilter: WatchDeps['buildIgnoreFilter'] = async () => () => false;

// Doubles for the config pipeline, packer, reporter and spinner, plus the ignore-filter stub
// and a manual clock that drives the rebuild debounce.
const createFlowDeps = () => {
  const { spinner, Spinner } = createMockSpinner();
  const clock = createManualClock();
  return {
    clock,
    deps: {
      buildMergedConfig: vi.fn<NonNullable<WatchDeps['buildMergedConfig']>>(),
      pack: vi.fn<NonNullable<WatchDeps['pack']>>(),
      reportResults: vi.fn(),
      Spinner,
      buildIgnoreFilter: noopBuildIgnoreFilter,
      timers: clock.timers,
    },
    mockSpinner: spinner,
  };
};

describe('watch option conflicts', () => {
  it('should throw when --watch is used with --remote', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true, remote: 'user/repo' };
    await expect(runCli(['.'], process.cwd(), options)).rejects.toThrow('--watch cannot be used with --remote');
  });

  it('should throw when --watch is used with --stdout', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true, stdout: true };
    await expect(runCli(['.'], process.cwd(), options)).rejects.toThrow('--watch cannot be used with --stdout');
  });

  it('should throw when --watch is used with --stdin', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true, stdin: true };
    await expect(runCli(['.'], process.cwd(), options)).rejects.toThrow('--watch cannot be used with --stdin');
  });

  it('should throw when --watch is used with --split-output', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true, splitOutput: 1000 };
    await expect(runCli(['.'], process.cwd(), options)).rejects.toThrow('--watch cannot be used with --split-output');
  });

  it('should throw when --watch is used with a positional remote URL', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true };
    await expect(runCli(['https://github.com/user/repo'], process.cwd(), options)).rejects.toThrow(
      '--watch cannot be used with remote URLs',
    );
  });

  it('should throw when --watch is used with --skill-generate', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true, skillGenerate: 'my-skill' };
    await expect(runCli(['.'], process.cwd(), options)).rejects.toThrow('--watch cannot be used with --skill-generate');
  });

  it('should throw when --watch is used with --copy', async () => {
    const { runCli } = await import('../../../src/cli/cliRun.js');
    const options: CliOptions = { watch: true, copy: true };
    await expect(runCli(['.'], process.cwd(), options)).rejects.toThrow('--watch cannot be used with --copy');
  });
});

describe('watchAction', () => {
  let mockWatcher: ReturnType<typeof createMockWatcher>;
  let flowDeps: ReturnType<typeof createFlowDeps>['deps'];
  let mockSpinner: ReturnType<typeof createFlowDeps>['mockSpinner'];
  let clock: ReturnType<typeof createFlowDeps>['clock'];

  beforeEach(() => {
    silenceLogger();

    mockWatcher = createMockWatcher();
    ({ deps: flowDeps, mockSpinner, clock } = createFlowDeps());

    flowDeps.buildMergedConfig.mockResolvedValue(
      createMockConfig({
        cwd: process.cwd(),
        output: {
          filePath: 'repomix-output.xml',
          style: 'plain',
          parsableStyle: false,
          fileSummary: true,
          directoryStructure: true,
          topFilesLength: 5,
          showLineNumbers: false,
          removeComments: false,
          removeEmptyLines: false,
          compress: false,
          copyToClipboard: false,
          stdout: false,
          git: {
            sortByChanges: true,
            sortByChangesMaxCommits: 100,
            includeDiffs: false,
          },
          files: true,
        },
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        include: [],
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      }),
    );

    flowDeps.pack.mockResolvedValue(createMockPackResult());
  });

  it('should run initial pack on start', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};

    // Import separately to ensure runWatchAction is called before abort
    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    const watchPromise = runWatchAction(['.'], process.cwd(), options, {
      watch: createMockWatch(mockWatcher),
      signal: controller.signal,
      ...flowDeps,
    });

    // Let initial pack complete
    await mockWatcher.started;

    controller.abort();
    await watchPromise;

    expect(flowDeps.pack).toHaveBeenCalledTimes(1);
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('should watch target directories instead of individual files', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);
    const cwd = process.cwd();

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], cwd, options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    await mockWatcher.started;

    controller.abort();
    await watchPromise;

    const expectedTargetPaths = [path.resolve(cwd, '.')];
    const watchCall = (mockWatch as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(watchCall[0]).toEqual(expectedTargetPaths);
    expect(watchCall[1]).toMatchObject({
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100 },
    });

    // chokidar v4+ dropped glob support in `ignored`, so it is now a predicate function.
    // The predicate's matching behavior is covered by the buildWatchIgnoreFilter unit tests.
    expect(typeof watchCall[1].ignored).toBe('function');
  });

  it('should re-pack on file change after debounce', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    // Let initial pack complete
    await mockWatcher.started;

    expect(flowDeps.pack).toHaveBeenCalledTimes(1);

    // Simulate a file change event
    mockWatcher.emit('change', 'src/index.ts');

    // Advance past the 300ms debounce
    await clock.advance(350);

    expect(flowDeps.pack).toHaveBeenCalledTimes(2);

    controller.abort();
    await watchPromise;
  });

  it('should debounce multiple rapid changes into one rebuild', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    // Let initial pack complete
    await mockWatcher.started;
    expect(flowDeps.pack).toHaveBeenCalledTimes(1);

    // Fire multiple rapid changes within the debounce window
    mockWatcher.emit('change', 'src/index.ts');
    await clock.advance(100);
    mockWatcher.emit('change', 'src/utils.ts');
    await clock.advance(100);
    mockWatcher.emit('add', 'src/new.ts');
    // Each event replaced the previous debounce timer instead of stacking another.
    expect(clock.pendingCount()).toBe(1);

    // Advance past the 300ms debounce from the last event
    await clock.advance(350);

    // Should only have rebuilt once (plus the initial pack)
    expect(flowDeps.pack).toHaveBeenCalledTimes(2);

    controller.abort();
    await watchPromise;
  });

  it('should not start a concurrent rebuild while one is in progress', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);

    // Make pack take some time so we can trigger a change mid-rebuild
    let resolveSecondPack: (() => void) | undefined;
    let packCallCount = 0;

    flowDeps.pack.mockImplementation(async () => {
      packCallCount++;
      if (packCallCount === 2) {
        // Second pack (first rebuild) — hold it open so we can trigger a change mid-rebuild
        await new Promise<void>((resolve) => {
          resolveSecondPack = resolve;
        });
      }
      return createMockPackResult();
    });

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    // Let initial pack complete
    await mockWatcher.started;
    expect(flowDeps.pack).toHaveBeenCalledTimes(1);

    // Trigger first rebuild
    mockWatcher.emit('change', 'src/index.ts');
    await clock.advance(350);

    // Second pack is now in progress (held open by resolveSecondPack)
    expect(flowDeps.pack).toHaveBeenCalledTimes(2);

    // Trigger another change while rebuild is in progress
    mockWatcher.emit('change', 'src/utils.ts');
    await clock.advance(350);

    // Should still be 2 because the rebuild guard prevents a concurrent pack
    expect(flowDeps.pack).toHaveBeenCalledTimes(2);

    // Resolve the in-progress pack — the pending rebuild should now fire
    resolveSecondPack?.();
    await clock.advance(350);

    // Now the queued rebuild should have run
    expect(flowDeps.pack).toHaveBeenCalledTimes(3);

    controller.abort();
    await watchPromise;
  });

  it('should log "Rebuilt at" timestamp after rebuild', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    // Let initial pack complete
    await mockWatcher.started;

    // Simulate a file change
    mockWatcher.emit('change', 'src/index.ts');

    // Advance past debounce
    await clock.advance(350);

    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Rebuilt at'));

    controller.abort();
    await watchPromise;
  });

  it('should log "Watching for changes..." after initial pack', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    // Let initial pack complete
    await mockWatcher.started;

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Watching'));

    controller.abort();
    await watchPromise;
  });

  it('should close watcher on abort signal', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      });
    })();

    // Let initial pack complete
    await mockWatcher.started;

    controller.abort();
    await watchPromise;

    expect(mockWatcher.close).toHaveBeenCalled();
  });

  it('should throw when the merged config enables split output (e.g. from a config file)', async () => {
    // validateWatchOptions in cliRun only sees CLI flags; split output can also come from
    // the config file, so runWatchAction must reject it on the merged config.
    flowDeps.buildMergedConfig.mockResolvedValue(
      createMockConfig({
        cwd: process.cwd(),
        output: { filePath: 'repomix-output.xml', splitOutput: 1000 },
      }),
    );

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    await expect(
      runWatchAction(['.'], process.cwd(), {}, { watch: createMockWatch(mockWatcher), ...flowDeps }),
    ).rejects.toThrow('split output');
  });

  it('should throw when the merged config writes to stdout via output "-" (e.g. from a config file)', async () => {
    // validateWatchOptions in cliRun only sees CLI flags. `output: "-"` in a config file
    // resolves to stdout mode (filePath === '-'), which the watch route must reject too.
    flowDeps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: process.cwd(), output: { filePath: '-' } }));

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    await expect(
      runWatchAction(['.'], process.cwd(), {}, { watch: createMockWatch(mockWatcher), ...flowDeps }),
    ).rejects.toThrow('stdout');
  });

  it('should throw when the merged config enables skill generation (e.g. from a config file)', async () => {
    // Skill generation can be set via the config file, which validateWatchOptions in cliRun
    // (CLI flags only) would miss, so the watch route must reject it on the merged config.
    flowDeps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: process.cwd(), skillGenerate: 'my-skill' }));

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    await expect(
      runWatchAction(['.'], process.cwd(), {}, { watch: createMockWatch(mockWatcher), ...flowDeps }),
    ).rejects.toThrow('skill generation');
  });

  it('should throw when the merged config enables copy to clipboard (e.g. from a config file)', async () => {
    // --copy is a hard conflict with --watch: re-packing on every change would repeatedly
    // overwrite the clipboard. copyToClipboard can also be set via the config file, which
    // validateWatchOptions in cliRun (CLI flags only) would miss.
    flowDeps.buildMergedConfig.mockResolvedValue(
      createMockConfig({
        cwd: process.cwd(),
        output: { filePath: 'repomix-output.xml', copyToClipboard: true },
      }),
    );

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    await expect(
      runWatchAction(['.'], process.cwd(), {}, { watch: createMockWatch(mockWatcher), ...flowDeps }),
    ).rejects.toThrow('--watch cannot be used with --copy');
  });

  it('throws when the merged config sets output.stdout (e.g. from a config file)', async () => {
    flowDeps.buildMergedConfig.mockResolvedValue(createMockConfig({ cwd: process.cwd(), output: { stdout: true } }));

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    await expect(
      runWatchAction(['.'], process.cwd(), {}, { watch: createMockWatch(mockWatcher), ...flowDeps }),
    ).rejects.toThrow('stdout');
  });

  it('logs an error when the watcher emits an error event', async () => {
    const controller = new AbortController();
    const mockWatch = createMockWatch(mockWatcher);

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    const watchPromise = runWatchAction(
      ['.'],
      process.cwd(),
      {},
      {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      },
    );

    await mockWatcher.started;

    // chokidar surfaces fatal fs errors (EMFILE, EACCES, ...) via the 'error' event.
    const watcherError = new Error('EMFILE: too many open files');
    mockWatcher.emit('error', watcherError);

    expect(logger.error).toHaveBeenCalledWith('File watcher error:', watcherError);

    controller.abort();
    await watchPromise;
  });

  it('logs an error when a rebuild pack rejects', async () => {
    const controller = new AbortController();
    const mockWatch = createMockWatch(mockWatcher);

    // Initial pack succeeds; the rebuild pack fails.
    flowDeps.pack
      .mockResolvedValueOnce(createMockPackResult())
      .mockRejectedValueOnce(new Error('pack failed during rebuild'));

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    const watchPromise = runWatchAction(
      ['.'],
      process.cwd(),
      {},
      {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      },
    );

    await mockWatcher.started;
    expect(flowDeps.pack).toHaveBeenCalledTimes(1);

    mockWatcher.emit('change', 'src/index.ts');
    await clock.advance(350);

    expect(flowDeps.pack).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith('Watch rebuild failed:', expect.any(Error));

    // The failed rebuild must not wedge the watcher — a later change still rebuilds.
    mockWatcher.emit('change', 'src/utils.ts');
    await clock.advance(350);
    expect(flowDeps.pack).toHaveBeenCalledTimes(3);

    controller.abort();
    await watchPromise;
  });

  it('registers and removes SIGINT/SIGTERM handlers when no abort signal is provided', async () => {
    // Production path: without an injected AbortSignal, runWatchAction installs
    // process SIGINT/SIGTERM listeners and removes them on cleanup. Stub the process
    // methods so the test never touches the real process listeners.
    const onSpy = vi.spyOn(process, 'on').mockReturnValue(process);
    const removeListenerSpy = vi.spyOn(process, 'removeListener').mockReturnValue(process);

    try {
      const mockWatch = createMockWatch(mockWatcher);
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      const watchPromise = runWatchAction(
        ['.'],
        process.cwd(),
        {},
        {
          watch: mockWatch,
          ...flowDeps,
        },
      );

      await mockWatcher.started;

      const sigintHandler = onSpy.mock.calls.find(([event]) => event === 'SIGINT')?.[1];
      const sigtermHandler = onSpy.mock.calls.find(([event]) => event === 'SIGTERM')?.[1];
      expect(sigintHandler).toBeTypeOf('function');
      // Both signals share the same idempotent cleanup handler.
      expect(sigtermHandler).toBe(sigintHandler);

      // Simulate Ctrl+C.
      await (sigintHandler as () => Promise<void>)();
      await watchPromise;

      expect(removeListenerSpy).toHaveBeenCalledWith('SIGINT', sigintHandler);
      expect(removeListenerSpy).toHaveBeenCalledWith('SIGTERM', sigintHandler);
      expect(mockWatcher.close).toHaveBeenCalled();
    } finally {
      onSpy.mockRestore();
      removeListenerSpy.mockRestore();
    }
  });

  it('cleans up only once when the shutdown signal fires twice (double Ctrl+C)', async () => {
    const onSpy = vi.spyOn(process, 'on').mockReturnValue(process);
    const removeListenerSpy = vi.spyOn(process, 'removeListener').mockReturnValue(process);

    try {
      const mockWatch = createMockWatch(mockWatcher);
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      const watchPromise = runWatchAction(
        ['.'],
        process.cwd(),
        {},
        {
          watch: mockWatch,
          ...flowDeps,
        },
      );

      await mockWatcher.started;

      const cleanup = onSpy.mock.calls.find(([event]) => event === 'SIGINT')?.[1] as () => Promise<void>;
      expect(cleanup).toBeTypeOf('function');

      // Two rapid Ctrl+C presses must not double-close the watcher.
      await cleanup();
      await cleanup();
      await watchPromise;

      expect(mockWatcher.close).toHaveBeenCalledTimes(1);
    } finally {
      onSpy.mockRestore();
      removeListenerSpy.mockRestore();
    }
  });

  it('does no work when the abort signal is already aborted before starting', async () => {
    const controller = new AbortController();
    controller.abort();
    const mockWatch = createMockWatch(mockWatcher);

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    await runWatchAction(
      ['.'],
      process.cwd(),
      {},
      {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      },
    );

    // The early-return guard short-circuits before any packing or watching happens.
    expect(flowDeps.pack).not.toHaveBeenCalled();
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('cancels a pending rebuild and ignores later changes once shutting down', async () => {
    const controller = new AbortController();
    const mockWatch = createMockWatch(mockWatcher);

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    const watchPromise = runWatchAction(
      ['.'],
      process.cwd(),
      {},
      {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      },
    );

    await mockWatcher.started;
    expect(flowDeps.pack).toHaveBeenCalledTimes(1);

    // Queue a rebuild (starts the debounce timer), then shut down before it fires.
    mockWatcher.emit('change', 'src/index.ts');
    controller.abort();
    await watchPromise;
    expect(clock.pendingCount()).toBe(0);

    // A change arriving after shutdown is ignored, and the cancelled timer never fires.
    mockWatcher.emit('change', 'src/utils.ts');
    await clock.advance(350);
    expect(flowDeps.pack).toHaveBeenCalledTimes(1);
  });

  it('logs an error when closing the watcher fails during shutdown', async () => {
    const controller = new AbortController();
    mockWatcher.close = vi.fn().mockRejectedValue(new Error('close failed'));
    const mockWatch = createMockWatch(mockWatcher);

    const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
    const watchPromise = runWatchAction(
      ['.'],
      process.cwd(),
      {},
      {
        watch: mockWatch,
        signal: controller.signal,
        ...flowDeps,
      },
    );

    await mockWatcher.started;
    controller.abort();
    // Shutdown must still complete (resolve) even though watcher.close() rejects.
    await watchPromise;

    expect(logger.error).toHaveBeenCalledWith('Error closing watcher:', expect.any(Error));
  });
});
