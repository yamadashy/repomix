import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { SecurityCheckItem, SecurityCheckType, SuspiciousFileResult } from './secretLintRunner.js';
import {
  createSecretLintConfig as defaultCreateSecretLintConfig,
  runSecretLint as defaultRunSecretLint,
} from './secretLintRunner.js';

export type { SecurityCheckItem, SecurityCheckType, SuspiciousFileResult } from './secretLintRunner.js';

// Number of items processed before reporting progress to avoid excessive UI updates
const PROGRESS_INTERVAL = 50;

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps = {
    runSecretLint: defaultRunSecretLint,
    createSecretLintConfig: defaultCreateSecretLintConfig,
  },
): Promise<SuspiciousFileResult[]> => {
  const gitDiffItems: SecurityCheckItem[] = [];
  const gitLogItems: SecurityCheckItem[] = [];

  // Add Git diff content for security checking if available
  if (gitDiffResult) {
    if (gitDiffResult.workTreeDiffContent) {
      gitDiffItems.push({
        filePath: 'Working tree changes',
        content: gitDiffResult.workTreeDiffContent,
        type: 'gitDiff',
      });
    }

    if (gitDiffResult.stagedDiffContent) {
      gitDiffItems.push({
        filePath: 'Staged changes',
        content: gitDiffResult.stagedDiffContent,
        type: 'gitDiff',
      });
    }
  }

  // Add Git log content for security checking if available
  if (gitLogResult) {
    if (gitLogResult.logContent) {
      gitLogItems.push({
        filePath: 'Git log history',
        content: gitLogResult.logContent,
        type: 'gitLog',
      });
    }
  }

  const fileItems: SecurityCheckItem[] = rawFiles.map((file) => ({
    filePath: file.path,
    content: file.content,
    type: 'file',
  }));

  const allItems = [...fileItems, ...gitDiffItems, ...gitLogItems];
  const totalItems = allItems.length;

  if (totalItems === 0) {
    return [];
  }

  logger.trace(`Starting security check for ${totalItems} files/content`);
  const startTime = process.hrtime.bigint();

  const config = deps.createSecretLintConfig();
  const suspiciousResults: SuspiciousFileResult[] = [];

  try {
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const result = await deps.runSecretLint(item.filePath, item.content, item.type, config);

      if (result !== null) {
        suspiciousResults.push(result);
      }

      const completedItems = i + 1;
      // Report progress at each interval boundary or at the final item
      if (completedItems % PROGRESS_INTERVAL === 0 || completedItems === totalItems) {
        progressCallback(`Running security check... (${completedItems}/${totalItems}) ${pc.dim(item.filePath)}`);
        logger.trace(`Running security check... (${completedItems}/${totalItems}) ${item.filePath}`);
      }
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return suspiciousResults;
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  }
};
