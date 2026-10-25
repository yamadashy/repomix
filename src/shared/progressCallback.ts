import { logger } from './logger.js';
import type { RepomixProgressCallback } from './types.js';

/**
 * Wrap an optional progress callback so a throwing or rejecting listener can never break
 * the action that reports progress. Progress is best effort: failures are only traced.
 */
export const createSafeProgressCallback =
  (progressCallback?: RepomixProgressCallback) =>
  (message: string): void => {
    if (!progressCallback) return;
    try {
      Promise.resolve(progressCallback(message)).catch((error) => {
        logger.trace('progressCallback error:', error);
      });
    } catch (error) {
      logger.trace('progressCallback error:', error);
    }
  };
