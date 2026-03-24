import { spawn } from 'node:child_process';
import * as clipboard from 'tinyclip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { copyToClipboardIfEnabled } from '../../../src/core/packager/copyToClipboardIfEnabled.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('tinyclip');
vi.mock('../../../src/shared/logger');
vi.mock('node:child_process');

describe('copyToClipboardIfEnabled', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.WAYLAND_DISPLAY = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should copy output to clipboard if flag enabled in config', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(progressCallback).toHaveBeenCalledWith('Copying to clipboard...');
    expect(clipboard.writeText).toHaveBeenCalledWith(output);
  });

  it('should not copy output to clipboard if flag disabled in config', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: false },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(progressCallback).not.toHaveBeenCalled();
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('should use wl-copy in Wayland environment', async () => {
    process.env.WAYLAND_DISPLAY = '1';
    process.env.NODE_ENV = 'development';

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
    vi.mocked(spawn).mockReturnValue(mockProc as unknown as ReturnType<typeof spawn>);

    // Simulate successful wl-copy execution
    mockProc.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
      return mockProc;
    });

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(spawn).toHaveBeenCalledWith('wl-copy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
    expect(mockProc.stdin.end).toHaveBeenCalledWith(output);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('should fallback to tinyclip when wl-copy fails', async () => {
    process.env.WAYLAND_DISPLAY = '1';
    process.env.NODE_ENV = 'development';

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
    vi.mocked(spawn).mockReturnValue(mockProc as unknown as ReturnType<typeof spawn>);

    // Simulate wl-copy failure
    mockProc.on.mockImplementation((event, callback) => {
      if (event === 'error') {
        callback(new Error('Command not found'));
      }
      return mockProc;
    });

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(spawn).toHaveBeenCalledWith('wl-copy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
    expect(clipboard.writeText).toHaveBeenCalledWith(output);
  });

  it('should handle tinyclip failure', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    vi.mocked(clipboard.writeText).mockRejectedValue(new Error('Clipboard access denied'));

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(progressCallback).toHaveBeenCalledWith('Copying to clipboard...');
    expect(clipboard.writeText).toHaveBeenCalledWith(output);
  });
});
