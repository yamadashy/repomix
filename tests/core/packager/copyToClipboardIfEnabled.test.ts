import clipboard from 'clipboardy';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepomixConfigMerged } from '../../../src/config/configSchema.js';
import { copyToClipboardIfEnabled } from '../../../src/core/packager/copyToClipboardIfEnabled.js';
import type { RepomixProgressCallback } from '../../../src/shared/types.js';

vi.mock('clipboardy');
vi.mock('../../shared/logger');

describe('copyToClipboardIfEnabled', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should copy output to clipboard if flag enabled in config', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: true },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(progressCallback).toHaveBeenCalledWith('Copying to clipboard...');
    expect(clipboard.write).toHaveBeenCalledWith(output);
  });

  it('should not copy output to clipboard if flag disabled in config', async () => {
    const output = 'test output';
    const config: RepomixConfigMerged = {
      output: { copyToClipboard: false },
    } as RepomixConfigMerged;
    const progressCallback: RepomixProgressCallback = vi.fn();

    await copyToClipboardIfEnabled(output, progressCallback, config);

    expect(progressCallback).not.toHaveBeenCalled();
    expect(clipboard.write).not.toHaveBeenCalled();
  });
});
