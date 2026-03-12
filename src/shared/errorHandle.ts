import { inspect } from 'node:util';
import { z } from 'zod';
import { REPOMIX_DISCORD_URL, REPOMIX_ISSUES_URL } from './constants.js';
import { logger, repomixLogLevels } from './logger.js';

export class RepomixError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RepomixError';
  }
}

export class RepomixConfigValidationError extends RepomixError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RepomixConfigValidationError';
  }
}

export class OperationCancelledError extends RepomixError {
  constructor(message = 'Operation cancelled') {
    super(message);
    this.name = 'OperationCancelledError';
  }
}

export const handleError = (error: unknown): void => {
  logger.log('');

  if (isRepomixError(error)) {
    logger.error(`✖ ${error.message}`);
    if (logger.getLogLevel() < repomixLogLevels.DEBUG) {
      logger.log('');
      logger.note('For detailed debug information, use the --verbose flag');
    }
    // If expected error, show stack trace for debugging
    logger.debug('Stack trace:', error.stack);
    // Show cause if available
    if (error.cause) {
      logger.debug('Caused by:', error.cause);
    }
  } else if (isError(error)) {
    logger.error(`✖ Unexpected error: ${error.message}`);
    // If unexpected error, show stack trace by default
    logger.note('Stack trace:', error.stack);

    if (logger.getLogLevel() < repomixLogLevels.DEBUG) {
      logger.log('');
      logger.note('For detailed debug information, use the --verbose flag');
    }
  } else {
    // Unknown errors
    logger.error('✖ An unknown error occurred');
    // Safely serialize unknown error objects
    try {
      logger.note(
        'Error details:',
        inspect(error, {
          depth: 3,
          colors: false,
          maxArrayLength: 10,
          maxStringLength: 200,
          breakLength: Number.POSITIVE_INFINITY,
        }),
      );
    } catch {
      logger.note('Error details: [Error object could not be serialized]');
    }

    if (logger.getLogLevel() < repomixLogLevels.DEBUG) {
      logger.log('');
      logger.note('For detailed debug information, use the --verbose flag');
    }
  }

  // Community support information
  logger.log('');
  logger.info('Need help?');
  logger.info(`• File an issue on GitHub: ${REPOMIX_ISSUES_URL}`);
  logger.info(`• Join our Discord community: ${REPOMIX_DISCORD_URL}`);
};

/**
 * Checks if an unknown value is an Error-like object.
 * Uses duck typing for errors serialized across worker process boundaries.
 */
const isError = (error: unknown): error is Error => {
  if (error instanceof Error) return true;

  if (typeof error !== 'object' || error === null) return false;

  const obj = error as Record<string, unknown>;
  return (
    typeof obj.message === 'string' &&
    // stack is optional across boundaries
    (!('stack' in obj) || typeof obj.stack === 'string') &&
    (!('name' in obj) || typeof obj.name === 'string')
  );
};

/**
 * Checks if an unknown value is a RepomixError-like object.
 * Uses error name property for serialized RepomixError across worker boundaries.
 */
const isRepomixError = (error: unknown): error is RepomixError => {
  if (error instanceof RepomixError) return true;

  if (typeof error !== 'object' || error === null) return false;

  const obj = error as Record<string, unknown>;
  return (
    typeof obj.message === 'string' &&
    'name' in obj &&
    (obj.name === RepomixError.name || obj.name === RepomixConfigValidationError.name)
  );
};

export const rethrowValidationErrorIfZodError = (error: unknown, message: string): void => {
  if (error instanceof z.ZodError) {
    const zodErrorText = error.issues.map((err) => `[${err.path.join('.')}] ${err.message}`).join('\n  ');
    throw new RepomixConfigValidationError(
      `${message}\n\n  ${zodErrorText}\n\n  Please check the config file and try again.`,
    );
  }
};
