import { vi } from 'vitest';
import { logger } from '../../src/shared/logger.js';

const outputMethods = ['error', 'warn', 'success', 'info', 'log', 'note', 'debug', 'trace'] as const;

type LoggerOutputMethod = (typeof outputMethods)[number];

/**
 * Replaces every output method of the shared logger with a silent spy so tests can assert on log calls
 * without printing. Call it in `beforeEach` (after any `vi.resetAllMocks()`, which would otherwise
 * restore the real implementations) and undo it with `vi.restoreAllMocks()` in `afterEach`.
 */
export const silenceLogger = () => {
  const spies = {} as Record<LoggerOutputMethod, ReturnType<typeof vi.spyOn>>;
  for (const method of outputMethods) {
    spies[method] = vi.spyOn(logger, method).mockImplementation(() => {});
  }
  return spies;
};
