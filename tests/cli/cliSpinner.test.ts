import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Spinner } from '../../src/cli/cliSpinner.js';
import type { CliOptions } from '../../src/cli/types.js';

const mockPicoInstances: Array<{
  start: ReturnType<typeof vi.fn>;
  setText: ReturnType<typeof vi.fn>;
  succeed: ReturnType<typeof vi.fn>;
  fail: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}> = [];

// Mock picospinner
vi.mock('picospinner', () => {
  return {
    Spinner: class MockPicoSpinner {
      start = vi.fn();
      setText = vi.fn();
      succeed = vi.fn();
      fail = vi.fn();
      stop = vi.fn();
      constructor() {
        mockPicoInstances.push(this);
      }
    },
  };
});

describe('cliSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPicoInstances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getLastPicoInstance = () => mockPicoInstances[mockPicoInstances.length - 1];

  describe('Spinner', () => {
    describe('when quiet mode is disabled', () => {
      it('should start spinner', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        expect(getLastPicoInstance().start).toHaveBeenCalled();
      });

      it('should update spinner message', async () => {
        const spinner = new Spinner('Initial message', {} as CliOptions);
        await spinner.start();

        spinner.update('Updated message');

        expect(getLastPicoInstance().setText).toHaveBeenCalledWith('Updated message');
      });

      it('should succeed with success message', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        spinner.succeed('Success!');

        expect(getLastPicoInstance().succeed).toHaveBeenCalledWith('Success!');
      });

      it('should fail with error message', async () => {
        const spinner = new Spinner('Processing...', {} as CliOptions);
        await spinner.start();

        spinner.fail('Failed!');

        expect(getLastPicoInstance().fail).toHaveBeenCalledWith('Failed!');
      });
    });

    describe('when quiet mode is enabled', () => {
      it('should not create PicoSpinner when quiet flag is true', async () => {
        const instancesBefore = mockPicoInstances.length;
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();

        expect(mockPicoInstances.length).toBe(instancesBefore);
      });

      it('should not create PicoSpinner when verbose flag is true', async () => {
        const instancesBefore = mockPicoInstances.length;
        const spinner = new Spinner('Processing...', { verbose: true } as CliOptions);
        await spinner.start();

        expect(mockPicoInstances.length).toBe(instancesBefore);
      });

      it('should not create PicoSpinner when stdout flag is true', async () => {
        const instancesBefore = mockPicoInstances.length;
        const spinner = new Spinner('Processing...', { stdout: true } as CliOptions);
        await spinner.start();

        expect(mockPicoInstances.length).toBe(instancesBefore);
      });

      it('should not throw when update is called in quiet mode', async () => {
        const spinner = new Spinner('Initial', { quiet: true } as CliOptions);
        await spinner.start();
        spinner.update('Updated');
      });

      it('should not throw when succeed is called in quiet mode', async () => {
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();
        spinner.succeed('Success!');
      });

      it('should not throw when fail is called in quiet mode', async () => {
        const spinner = new Spinner('Processing...', { quiet: true } as CliOptions);
        await spinner.start();
        spinner.fail('Failed!');
      });
    });
  });
});
