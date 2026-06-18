import type { RepomixConfigMerged } from '../../config/configSchema.js';
import { logger } from '../../shared/logger.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import { filterOutUntrustedFiles } from './filterOutUntrustedFiles.js';
import { runSecurityCheck, type SecurityTaskRunner, type SuspiciousFileResult } from './securityCheck.js';
import type { SecurityCheckStream } from './securityCheckStreaming.js';

const defaultDeps = {
  runSecurityCheck,
  filterOutUntrustedFiles,
  // Optional pre-warmed task runner created by pack() before file collection,
  // forwarded to runSecurityCheck so the worker spawn cost stays off the
  // critical path. Its lifecycle is owned by the caller.
  securityTaskRunner: undefined as SecurityTaskRunner | undefined,
  // Optional streaming session created by pack(). When present, most file
  // batches were already dispatched while collection was in flight, and
  // finalize() returns the same results runSecurityCheck would produce.
  securityCheckStream: undefined as SecurityCheckStream | undefined,
};

// Marks which files are suspicious and which are safe
// Returns Git diff results separately so they can be included in the output
// even if they contain sensitive information
export const validateFileSafety = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback,
  config: RepomixConfigMerged,
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  overrideDeps: Partial<typeof defaultDeps> = {},
) => {
  const deps = { ...defaultDeps, ...overrideDeps };
  let suspiciousFilesResults: SuspiciousFileResult[] = [];
  let suspiciousGitDiffResults: SuspiciousFileResult[] = [];
  let suspiciousGitLogResults: SuspiciousFileResult[] = [];

  if (config.security.enableSecurityCheck) {
    progressCallback('Running security check...');
    const allResults = deps.securityCheckStream
      ? await deps.securityCheckStream.finalize(rawFiles, progressCallback, gitDiffResult, gitLogResult)
      : await deps.runSecurityCheck(rawFiles, progressCallback, gitDiffResult, gitLogResult, {
          taskRunner: deps.securityTaskRunner,
        });

    // Separate Git diff and Git log results from regular file results
    suspiciousFilesResults = allResults.filter((result) => result.type === 'file');
    suspiciousGitDiffResults = allResults.filter((result) => result.type === 'gitDiff');
    suspiciousGitLogResults = allResults.filter((result) => result.type === 'gitLog');

    logSuspiciousContentWarning('Git diffs', suspiciousGitDiffResults);
    logSuspiciousContentWarning('Git logs', suspiciousGitLogResults);
  }

  const safeRawFiles = deps.filterOutUntrustedFiles(rawFiles, suspiciousFilesResults);
  const safeFilePaths = safeRawFiles.map((file) => file.path);
  logger.trace('Safe files count:', safeRawFiles.length);

  return {
    safeRawFiles,
    safeFilePaths,
    suspiciousFilesResults,
    suspiciousGitDiffResults,
    suspiciousGitLogResults,
  };
};

const logSuspiciousContentWarning = (contentType: string, results: SuspiciousFileResult[]) => {
  if (results.length === 0) {
    return;
  }

  logger.warn(`Security issues found in ${contentType}, but they will still be included in the output`);
  for (const result of results) {
    const issueCount = result.messages.length;
    const issueText = issueCount === 1 ? 'issue' : 'issues';
    logger.warn(`  - ${result.filePath}: ${issueCount} ${issueText} detected`);
  }
};
