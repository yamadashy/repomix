/**
 * File search functionality
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import { minimatch } from 'minimatch';
import { RepomixError } from '../../shared/errorHandle.js';
import { logger } from '../../shared/logger.js';
import { PermissionError, checkDirectoryPermissions } from './permissionCheck.js';

/**
 * Result of file search operations
 */
export interface FileSearchResult {
  /**
   * List of file paths
   */
  filePaths: string[];

  /**
   * List of empty directory paths
   */
  emptyDirPaths: string[];
}

/**
 * Search for files in a directory
 */
import { FileSearchConfig } from '../../shared/config/ConfigTypes.js';

export const searchFiles = async (rootDir: string, config: FileSearchConfig): Promise<FileSearchResult> => {
  return {
    filePaths: [],
    emptyDirPaths: [],
  };
};
