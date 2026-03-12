import logUpdate from 'log-update';
import pc from 'picocolors';
import type { CliOptions } from './types.js';

// Replicate cli-spinners dots animation
const dotsFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const dotsInterval = 80;

export class Spinner {
  private message: string;
  private currentFrame = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly isQuiet: boolean;

  constructor(message: string, cliOptions?: CliOptions) {
    this.message = message;
    // If the user has specified the verbose flag, don't show the spinner
    // Use optional chaining to handle undefined cliOptions (e.g., in bundled worker environments)
    this.isQuiet = cliOptions?.quiet || cliOptions?.verbose || cliOptions?.stdout || false;
  }

  start(): void {
    if (this.isQuiet) {
      return;
    }

    const framesLength = dotsFrames.length;
    this.interval = setInterval(() => {
      this.currentFrame++;
      const frame = dotsFrames[this.currentFrame % framesLength];
      logUpdate(`${pc.cyan(frame)} ${this.message}`);
    }, dotsInterval);
  }

  update(message: string): void {
    if (this.isQuiet) {
      return;
    }

    this.message = message;
  }

  stop(finalMessage: string): void {
    if (this.isQuiet) {
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logUpdate(finalMessage);
    logUpdate.done();
  }

  succeed(message: string): void {
    if (this.isQuiet) {
      return;
    }

    this.stop(`${pc.green('✔')} ${message}`);
  }

  fail(message: string): void {
    if (this.isQuiet) {
      return;
    }

    this.stop(`${pc.red('✖')} ${message}`);
  }
}
