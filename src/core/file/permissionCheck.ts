import { constants } from 'node:fs';
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

interface PermissionCheckDeps {
  readdir: (dirPath: string) => Promise<unknown>;
  access: (dirPath: string, mode: number) => Promise<void>;
  platform: () => NodeJS.Platform;
}

export const checkDirectoryPermissions = async (
  dirPath: string,
  deps: PermissionCheckDeps = {
    readdir: fs.readdir,
    access: fs.access,
    platform,
  },
): Promise<PermissionCheckResult> => {
  try {
    // First try to read directory contents
    await deps.readdir(dirPath);

    // Check specific permissions
    const details = {
      read: false,
      write: false,
      execute: false,
    };

    try {
      await deps.access(dirPath, constants.R_OK);
      details.read = true;
    } catch {}

    try {
      await deps.access(dirPath, constants.W_OK);
      details.write = true;
    } catch {}

    try {
      await deps.access(dirPath, constants.X_OK);
      details.execute = true;
    } catch {}

    const hasAllPermissions = details.read && details.write && details.execute;

    if (!hasAllPermissions) {
      return {
        hasAllPermission: false,
        details,
      };
    }

    return {
      hasAllPermission: true,
      details,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      switch (error.code) {
        case 'EPERM':
        case 'EACCES':
        case 'EISDIR':
          return {
            hasAllPermission: false,
            error: new PermissionError(
              getMacOSPermissionMessage(dirPath, error.code, deps.platform),
              dirPath,
              error.code,
            ),
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

const getMacOSPermissionMessage = (
  dirPath: string,
  errorCode: string | undefined,
  getPlatform: () => NodeJS.Platform,
): string => {
  if (getPlatform() === 'darwin') {
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
