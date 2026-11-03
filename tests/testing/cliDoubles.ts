import pc from 'picocolors';
import { vi } from 'vitest';
import type { Spinner } from '../../src/cli/cliSpinner.js';

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
