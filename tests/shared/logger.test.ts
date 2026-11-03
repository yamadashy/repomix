import pc from 'picocolors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, repomixLogLevels, setLogLevelByWorkerData } from '../../src/shared/logger.js';

// Tag each color so assertions do not depend on whether the terminal supports colors.
const stubColors = () => {
  for (const [color, tag] of [
    ['red', 'RED'],
    ['yellow', 'YELLOW'],
    ['green', 'GREEN'],
    ['cyan', 'CYAN'],
    ['dim', 'DIM'],
    ['blue', 'BLUE'],
    ['gray', 'GRAY'],
  ] as const) {
    vi.spyOn(pc, color).mockImplementation((str) => `${tag}:${str}`);
  }
};

describe('logger', () => {
  beforeEach(() => {
    stubColors();
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    logger.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should not log anything in SILENT mode', () => {
      logger.setLogLevel(repomixLogLevels.SILENT);

      logger.error('Error message');
      logger.warn('Warning message');
      logger.success('Success message');
      logger.info('Info message');
      logger.note('Note message');
      logger.debug('Debug message');
      logger.trace('Trace message');
      logger.log('Log message');

      expect(console.error).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should only log errors in ERROR mode', () => {
      logger.setLogLevel(repomixLogLevels.ERROR);

      logger.error('Error message');
      logger.warn('Warning message');

      expect(console.error).toHaveBeenCalledWith('RED:Error message');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  it('should log error messages', () => {
    logger.error('Error message');
    expect(console.error).toHaveBeenCalledWith('RED:Error message');
  });

  it('should log warning messages', () => {
    logger.warn('Warning message');
    expect(console.log).toHaveBeenCalledWith('YELLOW:Warning message');
  });

  it('should log success messages', () => {
    logger.success('Success message');
    expect(console.log).toHaveBeenCalledWith('GREEN:Success message');
  });

  it('should log info messages', () => {
    logger.info('Info message');
    expect(console.log).toHaveBeenCalledWith('CYAN:Info message');
  });

  it('should log log messages', () => {
    logger.log('Note message');
    expect(console.log).toHaveBeenCalledWith('Note message');
  });

  it('should not log debug messages when verbose is false', () => {
    logger.debug('Debug message');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should log debug messages when verbose is true', () => {
    logger.setLogLevel(repomixLogLevels.DEBUG);
    logger.debug('Debug message');
    expect(console.log).toHaveBeenCalledWith('BLUE:Debug message');
  });

  it('should not log trace messages when verbose is false', () => {
    logger.trace('Trace message');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should log trace messages when verbose is true', () => {
    logger.setLogLevel(repomixLogLevels.DEBUG);
    logger.trace('Trace message');
    expect(console.log).toHaveBeenCalledWith(pc.gray('Trace message'));
  });

  it('should format object arguments correctly', () => {
    const obj = { key: 'value' };
    logger.info('Object:', obj);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CYAN:Object: '));
  });

  it('should handle multiple arguments', () => {
    logger.info('Multiple', 'arguments', 123);
    expect(console.log).toHaveBeenCalledWith('CYAN:Multiple arguments 123');
  });

  describe('output stream', () => {
    const levels = ['warn', 'success', 'info', 'log', 'note', 'debug', 'trace'] as const;

    beforeEach(() => {
      logger.setLogLevel(repomixLogLevels.DEBUG);
      logger.setOutputStream('stderr');
    });

    it('sends every level but error to the chosen stream', () => {
      for (const level of levels) {
        logger[level](`${level} message`);
      }

      for (const level of levels) {
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(`${level} message`));
      }
      expect(console.log).not.toHaveBeenCalled();
    });

    it('writes to stdout again after init()', () => {
      logger.init();
      logger.info('Info message');

      expect(console.log).toHaveBeenCalledWith('CYAN:Info message');
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});

describe('setLogLevelByWorkerData', () => {
  // The env and workerData are both injected through deps, so no test touches process.env.
  const originalLevel = logger.getLogLevel();

  afterEach(() => {
    logger.setLogLevel(originalLevel);
  });

  it('sets log level from REPOMIX_LOG_LEVEL env var', () => {
    setLogLevelByWorkerData({ workerData: undefined, env: { REPOMIX_LOG_LEVEL: String(repomixLogLevels.DEBUG) } });

    expect(logger.getLogLevel()).toBe(repomixLogLevels.DEBUG);
  });

  it('ignores non-numeric REPOMIX_LOG_LEVEL', () => {
    const before = logger.getLogLevel();

    setLogLevelByWorkerData({ workerData: undefined, env: { REPOMIX_LOG_LEVEL: 'not-a-number' } });

    expect(logger.getLogLevel()).toBe(before);
  });

  it('ignores out-of-range REPOMIX_LOG_LEVEL', () => {
    const before = logger.getLogLevel();

    setLogLevelByWorkerData({ workerData: undefined, env: { REPOMIX_LOG_LEVEL: '999' } });

    expect(logger.getLogLevel()).toBe(before);
  });

  it('falls back to workerData when env var is unset', () => {
    setLogLevelByWorkerData({
      workerData: ['some-task', { logLevel: repomixLogLevels.ERROR }],
      env: {},
    });

    expect(logger.getLogLevel()).toBe(repomixLogLevels.ERROR);
  });

  it('ignores invalid logLevel in workerData', () => {
    const before = logger.getLogLevel();

    setLogLevelByWorkerData({
      workerData: ['some-task', { logLevel: 42 }],
      env: {},
    });

    expect(logger.getLogLevel()).toBe(before);
  });

  it('does nothing when workerData is null and env var is unset', () => {
    const before = logger.getLogLevel();

    setLogLevelByWorkerData({ workerData: null, env: {} });

    expect(logger.getLogLevel()).toBe(before);
  });
});
