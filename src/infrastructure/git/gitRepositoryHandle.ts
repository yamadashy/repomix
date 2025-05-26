/**
 * Git repository handling utilities
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { RepomixError } from '../../shared/errorHandle.js';

/**
 * Check if a directory is a git repository
 */
export const isGitRepository = async (rootDir: string): Promise<boolean> => {
  try {
    const gitDir = path.join(rootDir, '.git');
    const stats = await fs.stat(gitDir);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}
