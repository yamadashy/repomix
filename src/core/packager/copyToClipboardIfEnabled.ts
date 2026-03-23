import { spawn } from 'node:child_process';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';

export const copyToClipboardIfEnabled = async (
  output: string,
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
): Promise<void> => {
  if (!config.output.copyToClipboard) return;
  progressCallback('Copying to clipboard...');

  if (process.env.NODE_ENV !== 'test' && process.env.WAYLAND_DISPLAY) {
    logger.trace('Wayland detected; attempting wl-copy.');
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('wl-copy', [], { stdio: ['pipe', 'ignore', 'ignore'] });
        proc.on('error', (err) => reject(new Error(`Failed to execute wl-copy: ${err.message}`)));
        proc.on('close', (code) => (code ? reject(new Error(`wl-copy exited with code ${code}`)) : resolve()));
        proc.stdin.end(output);
      });
      logger.trace('Copied using wl-copy.');
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      logger.warn(`wl-copy failed (${msg}); falling back.`);
    }
  }

  try {
    logger.trace('Using tinyclip.');
    const clipboard = await import('tinyclip');
    await clipboard.writeText(output);
    logger.trace('Copied using tinyclip.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    logger.error(`tinyclip failed: ${msg}`);
  }
};
