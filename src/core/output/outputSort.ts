import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { ProcessedFile } from '../file/fileTypes.js';
import { getFileChangeCount } from '../git/getFileChangeCount.js';
import { isGitInstalled } from '../git/isGitInstalled.js';

// Sort files by git change count for output
export const sortOutputFiles = async (
  files: ProcessedFile[],
  config: RepomixConfigMerged,
  deps = {
    getFileChangeCount,
    isGitInstalled,
  },
): Promise<ProcessedFile[]> => {
  // If git sort is not enabled, return original order
  if (!config.output.git?.sortByChanges) {
    logger.trace('Git sort is not enabled');
    return files;
  }

  // Check if Git is installed
  const gitInstalled = await deps.isGitInstalled();
  if (!gitInstalled) {
    logger.trace('Git is not installed');
    return files;
  }

  // If `.git` directory is not found, return original order
  const gitFolderPath = path.resolve(config.cwd, '.git');
  try {
    await fs.access(gitFolderPath);
  } catch {
    logger.trace('Git folder not found');
    return files;
  }

  try {
    // Get file change counts
    const fileChangeCounts = await deps.getFileChangeCount(config.cwd, config.output.git?.sortByChangesMaxCommits);

    const sortedFileChangeCounts = Object.entries(fileChangeCounts).sort((a, b) => b[1] - a[1]);
    logger.trace('Git File change counts max commits:', config.output.git?.sortByChangesMaxCommits);
    logger.trace('Git File change counts:', sortedFileChangeCounts);

    // Sort files by change count (files with more changes go to the bottom)
    return [...files].sort((a, b) => {
      const countA = fileChangeCounts[a.path] || 0;
      const countB = fileChangeCounts[b.path] || 0;
      return countA - countB;
    });
  } catch (error) {
    // If git command fails, return original order
    return files;
  }
};
