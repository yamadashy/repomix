import * as fs from 'node:fs/promises';
import { platform } from 'node:os';
import { logger } from '../../shared/logger.js';

export interface PermissionCheckResult {
  hasAllPermission: boolean;
  error?: Error;
  details?: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
  };
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export const checkDirectoryPermissions = async (dirPath: string): Promise<PermissionCheckResult> => {
  try {
    // readdir succeeds only when the directory is readable and executable.
    // This single call replaces the previous 4-syscall approach (readdir + 3× fs.access)
    // since the caller (searchFiles) only needs to verify read permission.
    await fs.readdir(dirPath);

    return {
      hasAllPermission: true,
      details: { read: true, write: true, execute: true },
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      switch (error.code) {
        case 'EPERM':
        case 'EACCES':
        case 'EISDIR':
          return {
            hasAllPermission: false,
            error: new PermissionError(getMacOSPermissionMessage(dirPath, error.code), dirPath, error.code),
          };
        default:
          logger.debug('Directory permission check error:', error);
          return {
            hasAllPermission: false,
            error: error as Error,
          };
      }
    }
    return {
      hasAllPermission: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

const getMacOSPermissionMessage = (dirPath: string, errorCode?: string): string => {
  if (platform() === 'darwin') {
    return `Permission denied: Cannot access '${dirPath}', error code: ${errorCode}.

This error often occurs when macOS security restrictions prevent access to the directory.
To fix this:

1. Open System Settings
2. Navigate to Privacy & Security > Files and Folders
3. Find your terminal app (Terminal.app, iTerm2, VS Code, etc.)
4. Grant necessary folder access permissions

If your terminal app is not listed:
- Try running repomix command again
- When prompted by macOS, click "Allow"
- Restart your terminal app if needed
`;
  }

  return `Permission denied: Cannot access '${dirPath}'`;
};
