import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Spinner } from '../../src/cli/cliSpinner.js';
import type { CliOptions } from '../../src/cli/types.js';

// Mock log-update and picocolors
vi.mock('log-update', () => {
  const mockFn = vi.fn() as ReturnType<typeof vi.fn> & {
    done: ReturnType<typeof vi.fn>;
  };
  mockFn.done = vi.fn();
  return { default: mockFn };
});

vi.mock('picocolors', () => ({
  default: {
    cyan: (text: string) => `cyan(${text})`,
    green: (text: string) => `green(${text})`,
    red: (text: string) => `red(${text})`,
  },
}));

describe('cliSpinner', () => {
  let mockLogUpdateFn: ReturnType<typeof vi.fn> & { done: ReturnType<typeof vi.fn> };
  let mockLogUpdateDone: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Get the mocked module
    const logUpdateModule = await import('log-update');
    mockLogUpdateFn = logUpdateModule.default as unknown as typeof mockLogUpdateFn;
    mockLogUpdateDone = mockLogUpdateFn.done;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Spinner', () => {
    describe('when quiet mode is disabled', () => {
      it('should start spinner and update frames', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        // Advance time to trigger frame updates
        vi.advanceTimersByTime(80);
        expect(mockLogUpdateFn).toHaveBeenCalled();

        await spinner.stop('Done');
        expect(mockLogUpdateDone).toHaveBeenCalled();
      });

      it('should update spinner message', async () => {
        const spinner = new Spinner('Initial message', {} as CliOptions);
        await spinner.start();

        spinner.update('Updated message');

        vi.advanceTimersByTime(80);
        expect(mockLogUpdateFn).toHaveBeenCalled();

        await spinner.stop('Done');
      });

      it('should stop spinner with final message', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        await spinner.stop('Final message');

        expect(mockLogUpdateFn).toHaveBeenCalledWith('Final message');
        expect(mockLogUpdateDone).toHaveBeenCalled();
      });

      it('should succeed with success message', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        await spinner.succeed('Success!');

        expect(mockLogUpdateFn).toHaveBeenCalledWith('green(✔) Success!');
        expect(mockLogUpdateDone).toHaveBeenCalled();
      });

      it('should fail with error message', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        await spinner.fail('Failed!');

        expect(mockLogUpdateFn).toHaveBeenCalledWith('red(✖) Failed!');
        expect(mockLogUpdateDone).toHaveBeenCalled();
      });

      it('should cycle through animation frames', async () => {
        const spinner = new Spinner('Loading...', {} as CliOptions);
        await spinner.start();

        // Advance through multiple frames
        for (let i = 0; i < 10; i++) {
          vi.advanceTimersByTime(80);
        }

        expect(mockLogUpdateFn).toHaveBeenCalled();
        expect(mockLogUpdateFn.mock.calls.length).toBeGreaterThan(1);

        await spinner.stop('Complete');
      });
    });

    describe('when quiet mode is enabled', () => {
      it('should not start spinner when quiet flag is true', async () => {
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();

        vi.advanceTimersByTime(80);
        expect(mockLogUpdateFn).not.toHaveBeenCalled();

        await spinner.stop('Done');
      });

      it('should not start spinner when verbose flag is true', async () => {
        const spinner = new Spinner('Processing...', { verbose: true } as CliOptions);
        await spinner.start();

        vi.advanceTimersByTime(80);
        expect(mockLogUpdateFn).not.toHaveBeenCalled();

        await spinner.stop('Done');
      });

      it('should not start spinner when stdout flag is true', async () => {
        const spinner = new Spinner('Processing...', { stdout: true } as CliOptions);
        await spinner.start();

        vi.advanceTimersByTime(80);
        expect(mockLogUpdateFn).not.toHaveBeenCalled();

        await spinner.stop('Done');
      });

      it('should not update spinner message in quiet mode', async () => {
        const spinner = new Spinner('Initial', { quiet: true } as CliOptions);
        await spinner.start();
        spinner.update('Updated');

        vi.advanceTimersByTime(80);
        expect(mockLogUpdateFn).not.toHaveBeenCalled();

        await spinner.stop('Done');
      });

      it('should not show stop message in quiet mode', async () => {
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();
        await spinner.stop('Done');

        expect(mockLogUpdateFn).not.toHaveBeenCalled();
        expect(mockLogUpdateDone).not.toHaveBeenCalled();
      });

      it('should not show succeed message in quiet mode', async () => {
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();
        await spinner.succeed('Success!');

        expect(mockLogUpdateFn).not.toHaveBeenCalled();
        expect(mockLogUpdateDone).not.toHaveBeenCalled();
      });

      it('should not show fail message in quiet mode', async () => {
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();
        await spinner.fail('Failed!');

        expect(mockLogUpdateFn).not.toHaveBeenCalled();
        expect(mockLogUpdateDone).not.toHaveBeenCalled();
      });
    });

    describe('interval management', () => {
      it('should clear interval when stop is called', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        await spinner.stop('Done');

        expect(clearIntervalSpy).toHaveBeenCalled();
      });

      it('should not throw error when stop is called multiple times', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        await spinner.stop('Done');
        await spinner.stop('Done again');
      });
    });
  });
});
