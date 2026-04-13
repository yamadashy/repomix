import { EventEmitter } from 'node:events';
import path from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import type { WatchDeps } from '../../../src/cli/actions/watchAction.js';
import type { CliOptions } from '../../../src/cli/types.js';
import * as configLoader from '../../../src/config/configLoad.js';
import * as packager from '../../../src/core/packager.js';
import * as loggerModule from '../../../src/shared/logger.js';
import { createMockConfig } from '../../testing/testUtils.js';

vi.mock('../../../src/core/packager');
vi.mock('../../../src/config/configLoad');
vi.mock('../../../src/shared/logger');

const mockSpinner = {
  start: vi.fn() as MockedFunction<() => void>,
  update: vi.fn() as MockedFunction<(message: string) => void>,
  succeed: vi.fn() as MockedFunction<(message: string) => void>,
  fail: vi.fn() as MockedFunction<(message: string) => void>,
};

vi.mock('../../../src/cli/cliSpinner', () => {
  const MockSpinner = class {
    start = mockSpinner.start;
    update = mockSpinner.update;
    succeed = mockSpinner.succeed;
    fail = mockSpinner.fail;
  };
  return { Spinner: MockSpinner };
});
vi.mock('../../../src/cli/cliReport');
vi.mock('../../../src/cli/actions/migrationAction', () => ({
  runMigrationAction: vi.fn().mockResolvedValue({}),
}));

function createMockPackResult(overrides: Partial<packager.PackResult> = {}): packager.PackResult {
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
  const watcher = Object.assign(emitter, {
    close: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    unwatch: vi.fn(),
    getWatched: vi.fn().mockReturnValue({}),
    closed: false,
  });
  return watcher;
}

function createMockWatch(watcher: ReturnType<typeof createMockWatcher>): WatchDeps['watch'] {
  return vi.fn().mockReturnValue(watcher) as unknown as WatchDeps['watch'];
}

describe('watchAction', () => {
  let mockWatcher: ReturnType<typeof createMockWatcher>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    vi.clearAllMocks();

    mockWatcher = createMockWatcher();

    vi.mocked(configLoader.loadFileConfig).mockResolvedValue({});
    vi.mocked(configLoader.mergeConfigs).mockReturnValue(
      createMockConfig({
        cwd: process.cwd(),
        output: {
          filePath: 'output.txt',
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

    vi.mocked(packager.pack).mockResolvedValue(createMockPackResult());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('should run initial pack on start', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], process.cwd(), options, {
        watch: createMockWatch(mockWatcher),
        signal: controller.signal,
      });
    })();

    // Let initial pack complete
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await watchPromise;

    expect(packager.pack).toHaveBeenCalledTimes(1);
    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('should set up chokidar watcher on safeFilePaths resolved against targetPaths[0]', async () => {
    const controller = new AbortController();
    const options: CliOptions = {};
    const mockWatch = createMockWatch(mockWatcher);
    const cwd = process.cwd();

    const watchPromise = (async () => {
      const { runWatchAction } = await import('../../../src/cli/actions/watchAction.js');
      return runWatchAction(['.'], cwd, options, {
        watch: mockWatch,
        signal: controller.signal,
      });
    })();

    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await watchPromise;

    const rootDir = path.resolve(cwd, '.');
    const expectedPaths = ['src/index.ts', 'src/utils.ts'].map((p) => path.resolve(rootDir, p));

    expect(mockWatch).toHaveBeenCalledWith(expectedPaths, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100 },
    });
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
      });
    })();

    // Let initial pack complete
    await vi.advanceTimersByTimeAsync(0);

    expect(packager.pack).toHaveBeenCalledTimes(1);

    // Simulate a file change event
    mockWatcher.emit('change', 'src/index.ts');

    // Advance past the 300ms debounce
    await vi.advanceTimersByTimeAsync(350);

    expect(packager.pack).toHaveBeenCalledTimes(2);

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
      });
    })();

    // Let initial pack complete
    await vi.advanceTimersByTimeAsync(0);
    expect(packager.pack).toHaveBeenCalledTimes(1);

    // Fire multiple rapid changes within the debounce window
    mockWatcher.emit('change', 'src/index.ts');
    await vi.advanceTimersByTimeAsync(100);
    mockWatcher.emit('change', 'src/utils.ts');
    await vi.advanceTimersByTimeAsync(100);
    mockWatcher.emit('add', 'src/new.ts');

    // Advance past the 300ms debounce from the last event
    await vi.advanceTimersByTimeAsync(350);

    // Should only have rebuilt once (plus the initial pack)
    expect(packager.pack).toHaveBeenCalledTimes(2);

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
      });
    })();

    // Let initial pack complete
    await vi.advanceTimersByTimeAsync(0);

    // Simulate a file change
    mockWatcher.emit('change', 'src/index.ts');

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(350);

    expect(loggerModule.logger.success).toHaveBeenCalledWith(expect.stringContaining('Rebuilt at'));

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
      });
    })();

    // Let initial pack complete
    await vi.advanceTimersByTimeAsync(0);

    expect(loggerModule.logger.log).toHaveBeenCalledWith(expect.stringContaining('Watching for changes...'));

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
      });
    })();

    // Let initial pack complete
    await vi.advanceTimersByTimeAsync(0);

    controller.abort();
    await watchPromise;

    expect(mockWatcher.close).toHaveBeenCalled();
  });
});
