import { Spinner as PicoSpinner } from 'picospinner';
import type { CliOptions } from './types.js';

export class Spinner {
  private spinner: PicoSpinner | null;

  constructor(message: string, cliOptions?: CliOptions) {
    // If the user has specified the verbose flag, don't show the spinner
    // Use optional chaining to handle undefined cliOptions (e.g., in bundled worker environments)
    const isQuiet = cliOptions?.quiet || cliOptions?.verbose || cliOptions?.stdout || false;
    this.spinner = isQuiet ? null : new PicoSpinner(message);
  }

  start(): void {
    this.spinner?.start();
  }

  update(message: string): void {
    this.spinner?.setText(message);
  }

  succeed(message: string): void {
    this.spinner?.succeed(message);
  }

  fail(message: string): void {
    this.spinner?.fail(message);
  }
}
