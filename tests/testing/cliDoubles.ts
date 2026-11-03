import pc from 'picocolors';
import { vi } from 'vitest';
import type { Spinner } from '../../src/cli/cliSpinner.js';
import { logger } from '../../src/shared/logger.js';

/**
 * Silence the shared logger singleton with spies instead of `vi.mock`ing the module.
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

/**
 * Make picocolors wrap text in `NAME:` tags (e.g. `DIM:text`) so assertions can check which
 * style was applied without depending on whether the current terminal supports colors.
 */
export const tagColors = () => {
  for (const name of ['white', 'dim', 'green', 'yellow', 'red', 'cyan', 'underline'] as const) {
    vi.spyOn(pc, name).mockImplementation((str) => `${name.toUpperCase()}:${str}`);
  }
};

/**
 * A `Spinner` stand-in for `deps.Spinner`. Every instance shares the returned `spinner` mocks,
 * so a test can assert on the spinner created inside the action under test.
 */
export const createMockSpinner = () => {
  const spinner = {
    start: vi.fn<() => void>(),
    update: vi.fn<(message: string) => void>(),
    succeed: vi.fn<(message: string) => void>(),
    fail: vi.fn<(message: string) => void>(),
  };
  const MockSpinner = class {
    start = spinner.start;
    update = spinner.update;
    succeed = spinner.succeed;
    fail = spinner.fail;
  } as unknown as typeof Spinner;
  return { spinner, Spinner: MockSpinner };
};
