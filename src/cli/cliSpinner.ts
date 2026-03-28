import type { Spinner as PicoSpinner } from 'picospinner';
import type { CliOptions } from './types.js';

export class Spinner {
  private spinner: PicoSpinner | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(message: string, cliOptions?: CliOptions) {
    // If the user has specified the verbose flag, don't show the spinner
    // Use optional chaining to handle undefined cliOptions (e.g., in bundled worker environments)
    const isQuiet = cliOptions?.quiet || cliOptions?.verbose || cliOptions?.stdout || false;
    if (!isQuiet) {
      // Lazy-load picospinner — saves ~2-3ms on non-spinner paths (--version, --quiet,
      // --stdout, piped output) where the Spinner class is imported but never started.
      this.initPromise = import('picospinner').then(({ Spinner: PS }) => {
        this.spinner = new PS(message);
      });
    }
  }

  async start(): Promise<void> {
    await this.initPromise;
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
