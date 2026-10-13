import util from 'node:util';
import { workerData } from 'node:worker_threads';
import pc from 'picocolors';

export const repomixLogLevels = {
  SILENT: -1, // No output
  ERROR: 0, // error
  WARN: 1, // warn
  INFO: 2, // success, info, log, note
  DEBUG: 3, // debug, trace
} as const;

export type RepomixLogLevel = (typeof repomixLogLevels)[keyof typeof repomixLogLevels];

class RepomixLogger {
  private level: RepomixLogLevel = repomixLogLevels.INFO;

  constructor() {
    this.init();
  }

  init() {
    this.setLogLevel(repomixLogLevels.INFO);
  }

  setLogLevel(level: RepomixLogLevel) {
    this.level = level;
  }

  getLogLevel(): RepomixLogLevel {
    return this.level;
  }

  error(...args: unknown[]) {
    if (this.level >= repomixLogLevels.ERROR) {
      console.error(pc.red(this.formatArgs(args)));
    }
  }

  warn(...args: unknown[]) {
    if (this.level >= repomixLogLevels.WARN) {
      console.log(pc.yellow(this.formatArgs(args)));
    }
  }

  success(...args: unknown[]) {
    if (this.level >= repomixLogLevels.INFO) {
      console.log(pc.green(this.formatArgs(args)));
    }
  }

  info(...args: unknown[]) {
    if (this.level >= repomixLogLevels.INFO) {
      console.log(pc.cyan(this.formatArgs(args)));
    }
  }

  log(...args: unknown[]) {
    if (this.level >= repomixLogLevels.INFO) {
      console.log(this.formatArgs(args));
    }
  }

  note(...args: unknown[]) {
    if (this.level >= repomixLogLevels.INFO) {
      console.log(pc.dim(this.formatArgs(args)));
    }
  }

  debug(...args: unknown[]) {
    if (this.level >= repomixLogLevels.DEBUG) {
      console.log(pc.blue(this.formatArgs(args)));
    }
  }

  trace(...args: unknown[]) {
    if (this.level >= repomixLogLevels.DEBUG) {
      console.log(pc.gray(this.formatArgs(args)));
    }
  }

  private formatArgs(args: unknown[]): string {
    const useColors = pc.isColorSupported;
    return args
      .map((arg) => (typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: useColors }) : arg))
      .join(' ');
  }
}

export const logger = new RepomixLogger();

export const setLogLevel = (level: RepomixLogLevel) => {
  logger.setLogLevel(level);
};

/**
 * Set logger log level from workerData if valid.
 * This is used in worker threads where configuration is passed via workerData.
 */
const isValidLogLevel = (level: number): level is RepomixLogLevel => {
  return (
    level === repomixLogLevels.SILENT ||
    level === repomixLogLevels.ERROR ||
    level === repomixLogLevels.WARN ||
    level === repomixLogLevels.INFO ||
    level === repomixLogLevels.DEBUG
  );
};

export const setLogLevelByWorkerData = () => {
  // Try to get log level from environment variable first (for child_process workers)
  const envLogLevel = process.env.REPOMIX_LOG_LEVEL;
  if (envLogLevel !== undefined) {
    const logLevel = Number(envLogLevel);
    if (!Number.isNaN(logLevel) && isValidLogLevel(logLevel)) {
      setLogLevel(logLevel);
      return;
    }
  }

  // Fallback to workerData for worker_threads
  if (Array.isArray(workerData) && workerData.length > 1 && workerData[1]?.logLevel !== undefined) {
    const logLevel = workerData[1].logLevel;
    if (isValidLogLevel(logLevel)) {
      setLogLevel(logLevel);
    }
  }
};
