import type { SecretLintCoreConfig } from '@secretlint/types';
import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { QUICK_SECRET_SCREEN } from './quickSecretScreen.js';
import type { SecurityCheckItem, SecurityCheckType } from './workers/securityCheckWorker.js';

export type { SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

type SecretLintEngine = {
  runSecretLint: typeof import('./workers/securityCheckWorker.js').runSecretLint;
  createSecretLintConfig: typeof import('./workers/securityCheckWorker.js').createSecretLintConfig;
};
// Cache the Promise (not the resolved value) so concurrent callers within a
// single process share one `import()`. Reset on rejection so a transient
// failure (e.g. flaky module resolution) doesn't permanently poison the
// cache for long-lived consumers (MCP server, library use of `pack()`).
let _secretLintEnginePromise: Promise<SecretLintEngine> | undefined;
const defaultLoadSecretLintEngine = (): Promise<SecretLintEngine> => {
  _secretLintEnginePromise ??= import('./workers/securityCheckWorker.js')
    .then((m) => ({ runSecretLint: m.runSecretLint, createSecretLintConfig: m.createSecretLintConfig }))
    .catch((err) => {
      _secretLintEnginePromise = undefined;
      throw err;
    });
  return _secretLintEnginePromise;
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps = {
    loadSecretLintEngine: defaultLoadSecretLintEngine,
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

  // Combine all items, then split into batches
  const allItems = [...fileItems, ...gitDiffItems, ...gitLogItems];
  const totalItems = allItems.length;

  if (totalItems === 0) {
    return [];
  }

  const startTime = process.hrtime.bigint();
  logger.trace(`Starting security check for ${totalItems} files/content`);

  const candidates: SecurityCheckItem[] = [];
  for (const item of allItems) {
    if (QUICK_SECRET_SCREEN.test(item.content)) {
      candidates.push(item);
    }
  }

  const lastItem = allItems[allItems.length - 1];
  progressCallback(`Running security check... (${totalItems}/${totalItems}) ${pc.dim(lastItem.filePath)}`);
  logger.trace(`Running security check... (${totalItems}/${totalItems}) ${lastItem.filePath}`);

  if (candidates.length === 0) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms (pre-screen rejected all ${totalItems} items)`);
    return [];
  }

  let engine: SecretLintEngine;
  try {
    engine = await deps.loadSecretLintEngine();
  } catch (error) {
    logger.error('Error loading secretlint engine:', error);
    throw error;
  }

  const config: SecretLintCoreConfig = engine.createSecretLintConfig();

  try {
    logger.trace(
      `Pre-screen flagged ${candidates.length}/${totalItems} items; running lintSource on flagged items only`,
    );

    const lintResults = await Promise.all(
      candidates.map((item) => engine.runSecretLint(item.filePath, item.content, item.type, config)),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    return lintResults.filter((result): result is SuspiciousFileResult => result !== null);
  } catch (error) {
    logger.error('Error during security check:', error);
    throw error;
  }
};
