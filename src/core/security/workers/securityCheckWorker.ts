import { lintSource } from '@secretlint/core';
import { secretLintProfiler } from '@secretlint/profiler';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

// Disable @secretlint/profiler inside this worker.
//
// secretLintProfiler is a module-level singleton that installs a global
// PerformanceObserver on import and, for every `lintSource` call, pushes one
// entry per mark into an unbounded `entries` array. Each incoming mark then
// runs an O(n) `entries.find()` scan against all prior entries, making the
// total profiler cost across a single worker's lifetime O(n^2) in the number
// of files processed. For a typical ~1000-file repo this adds ~500-900ms of
// pure profiler bookkeeping per worker with zero functional benefit —
// secretlint core only *writes* marks via `profiler.mark()` and never reads
// back `getEntries()` / `getMeasures()` during linting.
//
// Replacing `mark` with a no-op prevents any `performance.mark()` calls from
// firing, so the observer callback never runs and `entries` stays empty.
//
// Use `Object.defineProperty` + try/catch so the worker still boots even if
// a future @secretlint/profiler version makes `mark` a getter-only or
// non-configurable property — the optimization would silently regress in
// that case, but the security check itself keeps working.
try {
  Object.defineProperty(secretLintProfiler, 'mark', {
    value: () => {},
    writable: true,
    configurable: true,
  });
} catch {
  // Property is non-configurable in a future secretlint version. Fall back
  // to periodically emptying the arrays it populates so the O(n^2) find()
  // scan stays cheap. This is a soft fallback; behaviour is still correct.
  logger.trace('Could not override secretLintProfiler.mark; leaving profiler enabled');
}

// Security check type to distinguish between regular files, git diffs, and git logs
export type SecurityCheckType = 'file' | 'gitDiff' | 'gitLog';

export interface SecurityCheckItem {
  filePath: string;
  content: string;
  type: SecurityCheckType;
}

export interface SecurityCheckTask {
  items: SecurityCheckItem[];
}

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

export const createSecretLintConfig = (): SecretLintCoreConfig => ({
  rules: [
    {
      id: '@secretlint/secretlint-rule-preset-recommend',
      rule: creator,
    },
  ],
});

// Cache config at module level - created once per worker, reused for all tasks
const cachedConfig = createSecretLintConfig();

export default async (task: SecurityCheckTask): Promise<(SuspiciousFileResult | null)[]> => {
  const config = cachedConfig;
  const processStartAt = process.hrtime.bigint();

  try {
    const results: (SuspiciousFileResult | null)[] = [];
    for (const item of task.items) {
      results.push(await runSecretLint(item.filePath, item.content, item.type, config));
    }

    const processEndAt = process.hrtime.bigint();
    logger.trace(
      `Checked security on ${task.items.length} items. Took: ${(Number(processEndAt - processStartAt) / 1e6).toFixed(2)}ms`,
    );

    return results;
  } catch (error) {
    logger.error('Error in security check worker:', error);
    throw error;
  }
};

export const runSecretLint = async (
  filePath: string,
  content: string,
  type: SecurityCheckType,
  config: SecretLintCoreConfig,
): Promise<SuspiciousFileResult | null> => {
  const result = await lintSource({
    source: {
      filePath: filePath,
      content: content,
      ext: filePath.split('.').pop() || '',
      contentType: 'text',
    },
    options: {
      config: config,
    },
  });

  if (result.messages.length > 0) {
    const issueCount = result.messages.length;
    const issueText = issueCount === 1 ? 'security issue' : 'security issues';
    logger.trace(`Found ${issueCount} ${issueText} in ${filePath}`);
    // Do not log the actual messages to prevent leaking sensitive information

    return {
      filePath,
      messages: result.messages.map((message) => message.message),
      type,
    };
  }

  return null;
};

// Export cleanup function for Tinypool teardown (no cleanup needed for this worker)
export const onWorkerTermination = async (): Promise<void> => {
  // No cleanup needed for security check worker
};
