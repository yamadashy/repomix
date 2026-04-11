import perf_hooks from 'node:perf_hooks';
import { lintSource } from '@secretlint/core';
import { creator } from '@secretlint/secretlint-rule-preset-recommend';
import type { SecretLintCoreConfig } from '@secretlint/types';
import { logger, setLogLevelByWorkerData } from '../../../shared/logger.js';

// Initialize logger configuration from workerData at module load time
// This must be called before any logging operations in the worker
setLogLevelByWorkerData();

// Neutralize @secretlint/profiler inside this worker by no-op'ing
// `perf_hooks.performance.mark`.
//
// secretLintProfiler is a module-level singleton that installs a global
// PerformanceObserver on import, and for every `lintSource` call it pushes
// one entry per mark into an unbounded `entries` array. Each incoming mark
// then runs an O(n) `entries.find()` scan against all prior entries, making
// the total profiler cost across a single worker's lifetime O(n^2) in the
// number of files processed. For a typical ~1000-file repo this adds ~1.2s
// of pure profiler bookkeeping per worker with zero functional benefit —
// @secretlint/core only *writes* marks via `profiler.mark()` and never reads
// back `getEntries()` / `getMeasures()` during linting.
//
// Why patch `performance.mark` instead of the profiler singleton:
// `@secretlint/core` declares an exact-version peer dep on
// `@secretlint/profiler`. Whenever that version drifts from our top-level
// resolution, npm nests a second copy under
// `node_modules/@secretlint/core/node_modules/@secretlint/profiler`, and the
// copy `@secretlint/core` actually calls is no longer the same singleton we
// imported. Both profiler copies, however, share the single Node built-in
// `perf_hooks.performance` object and call its `.mark()` for every event.
// Replacing `performance.mark` with a no-op therefore neutralizes both (or
// any number of) copies simultaneously without dependence on module layout.
// The worker thread is isolated to secretlint and imports no other code
// that relies on `performance.mark`, so there is no observable side effect.
//
// The assignment creates an own property on the `perf_hooks.performance`
// instance that shadows `Performance.prototype.mark`; the prototype is
// deliberately left alone so no other `Performance` instance in the worker
// (or the Node process) is affected.
Object.defineProperty(perf_hooks.performance, 'mark', {
  value: () => undefined,
  writable: true,
  configurable: true,
});

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
