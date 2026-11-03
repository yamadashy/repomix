import type { spawn } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { copyToClipboardIfEnabled } from '../../../src/core/packager/copyToClipboardIfEnabled.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';
import { type MockedDeps, mockOverloaded } from '../../testing/depsDoubles.js';
import { silenceLogger } from '../../testing/loggerDoubles.js';

type CopyDeps = NonNullable<Parameters<typeof copyToClipboardIfEnabled>[3]>;

describe('copyToClipboardIfEnabled', () => {
  let deps: MockedDeps<CopyDeps>;

  beforeEach(() => {
    silenceLogger();
    deps = {
      spawn: mockOverloaded<typeof spawn>(),
      writeClipboardText: vi.fn<CopyDeps['writeClipboardText']>().mockResolvedValue(undefined),
      // No WAYLAND_DISPLAY, so the tinyclip path is taken unless a test opts into Wayland.
      env: {},
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should copy output to clipboard if flag enabled in config', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    await copyToClipboardIfEnabled(output, progressCallback, config, deps);

    expect(progressCallback).toHaveBeenCalledWith('Copying to clipboard...');
    expect(deps.writeClipboardText).toHaveBeenCalledWith(output);
  });

  it('should not copy output to clipboard if flag disabled in config', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: false },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    await copyToClipboardIfEnabled(output, progressCallback, config, deps);

    expect(progressCallback).not.toHaveBeenCalled();
    expect(deps.writeClipboardText).not.toHaveBeenCalled();
  });

  it('should use wl-copy in Wayland environment', async () => {
    deps.env = { WAYLAND_DISPLAY: '1' };

    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    type MockProc = {
      on: ReturnType<typeof vi.fn>;
      stdin: { end: ReturnType<typeof vi.fn> };
    };

    const mockProc: MockProc = {
      on: vi.fn(),
      stdin: { end: vi.fn() },
    };
    deps.spawn.mockReturnValue(mockProc as unknown as ReturnType<typeof spawn>);

    // Simulate successful wl-copy execution
    mockProc.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
      return mockProc;
    });

    await copyToClipboardIfEnabled(output, progressCallback, config, deps);

    expect(deps.spawn).toHaveBeenCalledWith('wl-copy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
    expect(mockProc.stdin.end).toHaveBeenCalledWith(output);
    expect(deps.writeClipboardText).not.toHaveBeenCalled();
  });

  it('should fallback to tinyclip when wl-copy fails', async () => {
    deps.env = { WAYLAND_DISPLAY: '1' };

    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    type MockProc = {
      on: ReturnType<typeof vi.fn>;
      stdin: { end: ReturnType<typeof vi.fn> };
    };

    const mockProc: MockProc = {
      on: vi.fn(),
      stdin: { end: vi.fn() },
    };
    deps.spawn.mockReturnValue(mockProc as unknown as ReturnType<typeof spawn>);

    // Simulate wl-copy failure
    mockProc.on.mockImplementation((event, callback) => {
      if (event === 'error') {
        callback(new Error('Command not found'));
      }
      return mockProc;
    });

    await copyToClipboardIfEnabled(output, progressCallback, config, deps);

    expect(deps.spawn).toHaveBeenCalledWith('wl-copy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
    expect(deps.writeClipboardText).toHaveBeenCalledWith(output);
  });

  it('should handle tinyclip failure', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    deps.writeClipboardText.mockRejectedValue(new Error('Clipboard access denied'));

    await copyToClipboardIfEnabled(output, progressCallback, config, deps);

    expect(progressCallback).toHaveBeenCalledWith('Copying to clipboard...');
    expect(deps.writeClipboardText).toHaveBeenCalledWith(output);
  });
});
