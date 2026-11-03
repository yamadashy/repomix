import { vi } from 'vitest';
import { logger } from '../../src/shared/logger.js';

/**
 * Silence the shared logger singleton with spies instead of `vi.mock`ing the module, so tests can
 * still assert on calls such as `expect(logger.warn).toHaveBeenCalled()`.
 * Level and stream setters are stubbed too, so a test that passes `--verbose` or `--stdout`
 * cannot leak logger state into later tests. Call it after any `vi.resetAllMocks()` (which
 * would otherwise restore the real implementations) and pair it with `vi.restoreAllMocks()`.
 */
export const silenceLogger = () => ({
  error: vi.spyOn(logger, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(logger, 'warn').mockImplementation(() => {}),
  success: vi.spyOn(logger, 'success').mockImplementation(() => {}),
  info: vi.spyOn(logger, 'info').mockImplementation(() => {}),
  log: vi.spyOn(logger, 'log').mockImplementation(() => {}),
  note: vi.spyOn(logger, 'note').mockImplementation(() => {}),
  debug: vi.spyOn(logger, 'debug').mockImplementation(() => {}),
  trace: vi.spyOn(logger, 'trace').mockImplementation(() => {}),
  setLogLevel: vi.spyOn(logger, 'setLogLevel').mockImplementation(() => {}),
  setOutputStream: vi.spyOn(logger, 'setOutputStream').mockImplementation(() => {}),
});
