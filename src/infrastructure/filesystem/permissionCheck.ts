/**
 * File system permission checking utilities
 */
import fs from 'node:fs/promises';
import { platform } from 'node:os';
import { logger } from '../../shared/logger.js';

/**
 * Result of permission check
 */
export interface PermissionCheckResult {
  hasAllPermission: boolean;
  error?: Error;
  details?: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}

/**
 * Error thrown when permission is denied
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Check directory permissions
 */
export const checkDirectoryPermissions = async (dirPath: string): Promise<PermissionCheckResult> => {
  try {
    await fs.access(dirPath, fs.constants.R_OK);
    return {
      hasAllPermission: true,
      details: {
        read: true,
        write: true,
        execute: true,
      },
    };
  } catch (error) {
    logger.debug(`Permission check failed for ${dirPath}:`, error);
    return {
      hasAllPermission: false,
      error: new PermissionError(`Permission denied for directory: ${dirPath}`, dirPath),
      details: {
        read: false,
        write: false,
        execute: false,
      },
    };
  }
};
