import { vi } from 'vitest';
import { logger } from '../../src/shared/logger.js';

const loggerMethods = ['error', 'warn', 'success', 'info', 'log', 'note', 'debug', 'trace'] as const;

// Replace every logger method with a silent spy so tests can assert on calls
// (e.g. `expect(logger.warn).toHaveBeenCalled()`) without printing output.
// Pair with `vi.restoreAllMocks()` in `afterEach`.
export const silenceLogger = () => {
  for (const method of loggerMethods) {
    vi.spyOn(logger, method).mockImplementation(() => {});
  }
};
