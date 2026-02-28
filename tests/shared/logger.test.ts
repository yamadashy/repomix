import pc from 'picocolors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, repomixLogLevels } from '../../src/shared/logger.js';

vi.mock('picocolors', () => ({
  default: {
    red: vi.fn((str) => `RED:${str}`),
    yellow: vi.fn((str) => `YELLOW:${str}`),
    green: vi.fn((str) => `GREEN:${str}`),
    cyan: vi.fn((str) => `CYAN:${str}`),
    dim: vi.fn((str) => `DIM:${str}`),
    blue: vi.fn((str) => `BLUE:${str}`),
    gray: vi.fn((str) => `GRAY:${str}`),
    isColorSupported: true,
  },
}));

describe('logger', () => {
  beforeEach(() => {
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

  describe('color support in formatArgs', () => {
    it('should pass pc.isColorSupported to util.inspect for object formatting', () => {
      const obj = { key: 'value' };
      logger.info('Test:', obj);
      // When isColorSupported is true (mock), util.inspect should use colors
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('CYAN:Test: '));
    });
  });
});
