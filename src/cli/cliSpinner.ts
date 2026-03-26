import { Spinner as PicoSpinner } from 'picospinner';
import type { CliOptions } from './types.js';

export class Spinner {
  private spinner: PicoSpinner;
  private readonly isQuiet: boolean;

  constructor(message: string, cliOptions?: CliOptions) {
    this.spinner = new PicoSpinner(message);
    // If the user has specified the verbose flag, don't show the spinner
    // Use optional chaining to handle undefined cliOptions (e.g., in bundled worker environments)
    this.isQuiet = cliOptions?.quiet || cliOptions?.verbose || cliOptions?.stdout || false;
  }

  start(): void {
    if (this.isQuiet) {
      return;
    }

    this.spinner.start();
  }

  update(message: string): void {
    if (this.isQuiet) {
      return;
    }

    this.spinner.setText(message);
  }

  succeed(message: string): void {
    if (this.isQuiet) {
      return;
    }

    this.spinner.succeed(message);
  }

  fail(message: string): void {
    if (this.isQuiet) {
      return;
    }

    this.spinner.fail(message);
  }
}
