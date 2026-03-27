import pc from 'picocolors';
import { logger } from '../../shared/logger.js';
import type { initTaskRunner as InitTaskRunnerType, TaskRunner } from '../../shared/processConcurrency.js';
import type { RepomixProgressCallback } from '../../shared/types.js';
import type { RawFile } from '../file/fileTypes.js';
import type { GitDiffResult } from '../git/gitDiffHandle.js';
import type { GitLogResult } from '../git/gitLogHandle.js';
import type { SecurityCheckTask, SecurityCheckType } from './workers/securityCheckWorker.js';

export interface SuspiciousFileResult {
  filePath: string;
  messages: string[];
  type: SecurityCheckType;
}

// Batch task runner: sends multiple files per IPC round-trip to reduce
// structured clone overhead (~20 files/batch vs 1 file/task).
export type SecurityTaskRunner = TaskRunner<SecurityCheckTask[], (SuspiciousFileResult | null)[]>;

// Lazy-load tinypool — defers ~20ms of module loading until security check actually starts,
// reducing worker process startup time so the worker is ready to receive tasks sooner.
let _initTaskRunner: typeof InitTaskRunnerType | undefined;
const getInitTaskRunner = async (): Promise<typeof InitTaskRunnerType> => {
  if (!_initTaskRunner) {
    const mod = await import('../../shared/processConcurrency.js');
    _initTaskRunner = mod.initTaskRunner;
  }
  return _initTaskRunner;
};

/**
 * Quick pre-filter: check if file content contains any substring that could match
 * a secretlint rule. Each trigger corresponds to a required prefix/marker for rules in
 * @secretlint/secretlint-rule-preset-recommend v8.x:
 *
 * - AWS:        AKIA (access key ID prefix)
 * - Anthropic:  sk-ant- (API key prefix)
 * - BasicAuth:  scheme://...@ on same line (URL with potential credentials)
 * - Database:   mongodb+srv://, postgres://, mysql://, redis://, amqp://
 * - GCP:        service_account, authorized_user (credential JSON markers)
 * - GitHub:     ghp_, gho_, ghu_, ghs_, ghr_, github_pat_
 * - Linear:     lin_api_
 * - NPM:        npm_
 * - OpenAI:     sk-proj- (project key prefix)
 * - PrivateKey:  -----BEGIN
 * - SendGrid:   SG.
 * - Shopify:    shpat_, shpca_, shppa_, shpss_, shpit_
 * - Slack:      xoxb-, xoxp-, xoxa-
 *
 * Files without any trigger are guaranteed to pass all secretlint rules.
 * Git diff/log content always goes through full checking (not pre-filtered).
 * For typical source repos, this skips 80-99% of files from the expensive
 * IPC + regex matching in worker threads.
 */
// Single compiled regex combining all secret trigger patterns into one pass.
// V8's irregexp engine compiles alternation into an automaton that scans the string once,
// replacing separate .includes() calls (each scanning the full string) with a single pass.
//
// BasicAuth check is handled separately via indexOf to avoid a polynomial regex pattern
// flagged by CodeQL (the \w:\/\/[^\n@]{1,256}@ pattern). The string-based approach is
// equally fast and avoids any backtracking concern.
const SECRET_TRIGGER_PATTERN =
  /AKIA|-----BEGIN|xoxb-|xoxp-|xoxa-|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|npm_|SG\.|shpat_|shpca_|shppa_|shpss_|shpit_|lin_api_|sk-ant-|sk-proj-|mongodb\+srv:\/\/|postgres:\/\/|mysql:\/\/|redis:\/\/|amqp:\/\/|service_account|authorized_user/;

/**
 * Check for BasicAuth pattern: scheme://...@ on the same line.
 * Uses indexOf instead of regex to avoid potential ReDoS with backtracking.
 * Scans for "://" occurrences and checks if "@" appears on the same line within 256 chars.
 */
const containsBasicAuthPattern = (content: string): boolean => {
  let searchFrom = 0;
  while (true) {
    const schemePos = content.indexOf('://', searchFrom);
    if (schemePos < 0) return false;
    // Check that a word char precedes "://"
    if (schemePos > 0) {
      const charBefore = content.charCodeAt(schemePos - 1);
      // a-z, A-Z, 0-9, _
      const isWord =
        (charBefore >= 97 && charBefore <= 122) ||
        (charBefore >= 65 && charBefore <= 90) ||
        (charBefore >= 48 && charBefore <= 57) ||
        charBefore === 95;
      if (isWord) {
        // Look for "@" within 256 chars on the same line after "://"
        const afterScheme = schemePos + 3;
        const limit = Math.min(afterScheme + 256, content.length);
        for (let i = afterScheme; i < limit; i++) {
          const ch = content.charCodeAt(i);
          if (ch === 64) return true; // '@'
          if (ch === 10) break; // '\n' — stop at line boundary
        }
      }
    }
    searchFrom = schemePos + 3;
  }
};

export const contentMayContainSecret = (content: string): boolean => {
  // Short-circuit: files under 8 bytes can't contain any meaningful secret pattern
  if (content.length < 8) return false;

  return SECRET_TRIGGER_PATTERN.test(content) || containsBasicAuthPattern(content);
};

// ── Security result cache ─────────────────────────────────────────────
// Caches per-task security check results across pack() calls for MCP/website server.
// On warm runs with unchanged file content, skips the expensive worker IPC + secretlint
// regex matching entirely. Validated by content length (the file content cache in
// fileRead.ts already validates by mtime+size, so same length ≈ same content here).
// Covers file, gitDiff, and gitLog tasks.
const MAX_SECURITY_CACHE_SIZE = 5000;
const securityResultCache = new Map<string, { contentLen: number; result: SuspiciousFileResult | null }>();

const buildSecurityCacheKey = (filePath: string, type: SecurityCheckType): string => {
  return `${type}\0${filePath}`;
};

/**
 * Clear the security result cache. Exported for testing.
 */
export const clearSecurityResultCache = (): void => {
  securityResultCache.clear();
};

export const runSecurityCheck = async (
  rawFiles: RawFile[],
  progressCallback: RepomixProgressCallback = () => {},
  gitDiffResult?: GitDiffResult,
  gitLogResult?: GitLogResult,
  deps: {
    initTaskRunner: typeof InitTaskRunnerType;
  } | null = null,
  preCreatedTaskRunner?: SecurityTaskRunner,
): Promise<SuspiciousFileResult[]> => {
  const allTasks: SecurityCheckTask[] = [];
  const cachedResults: SuspiciousFileResult[] = [];

  // Add Git diff content for security checking if available
  if (gitDiffResult) {
    if (gitDiffResult.workTreeDiffContent) {
      allTasks.push({
        filePath: 'Working tree changes',
        content: gitDiffResult.workTreeDiffContent,
        type: 'gitDiff',
      });
    }

    if (gitDiffResult.stagedDiffContent) {
      allTasks.push({
        filePath: 'Staged changes',
        content: gitDiffResult.stagedDiffContent,
        type: 'gitDiff',
      });
    }
  }

  // Add Git log content for security checking if available
  if (gitLogResult) {
    if (gitLogResult.logContent) {
      allTasks.push({
        filePath: 'Git log history',
        content: gitLogResult.logContent,
        type: 'gitLog',
      });
    }
  }

  // Pre-filter files that cannot match any secretlint rule.
  for (const file of rawFiles) {
    if (contentMayContainSecret(file.content)) {
      allTasks.push({ filePath: file.path, content: file.content, type: 'file' });
    }
  }

  // Separate cached tasks from uncached tasks. On warm MCP/server runs with unchanged
  // files, 100% of tasks hit the cache, completely skipping the ~18ms worker IPC.
  const uncachedTasks: SecurityCheckTask[] = [];
  for (const task of allTasks) {
    const cacheKey = buildSecurityCacheKey(task.filePath, task.type);
    const cached = securityResultCache.get(cacheKey);
    if (cached && cached.contentLen === task.content.length) {
      if (cached.result) {
        cachedResults.push(cached.result);
      }
    } else {
      uncachedTasks.push(task);
    }
  }

  logger.trace(
    `Security pre-filter: ${allTasks.length}/${rawFiles.length} files need checking, ${allTasks.length - uncachedTasks.length} cached`,
  );

  // If all tasks are cached, return immediately without touching the worker pool
  if (uncachedTasks.length === 0) {
    logger.trace('Security check: all results cached, skipping worker');
    return cachedResults;
  }

  // Use pre-created pool if available (pre-warmed during file collection),
  // otherwise create a new one on demand
  let taskRunner: SecurityTaskRunner;
  if (preCreatedTaskRunner) {
    taskRunner = preCreatedTaskRunner;
  } else {
    const resolvedDeps = deps ?? {
      initTaskRunner: await getInitTaskRunner(),
    };
    taskRunner = resolvedDeps.initTaskRunner<SecurityCheckTask[], (SuspiciousFileResult | null)[]>({
      numOfTasks: uncachedTasks.length,
      workerType: 'securityCheck',
      runtime: 'worker_threads',
    });
  }

  try {
    logger.trace(`Starting security check for ${uncachedTasks.length} files/content`);
    const startTime = process.hrtime.bigint();

    // Batch tasks to reduce IPC overhead. Each pool.run() involves structured clone
    // serialization of file content across the worker_thread boundary. Batching ~50 files
    // per round-trip amortizes the per-message overhead (~0.5ms) across multiple files.
    const BATCH_SIZE = 50;
    const batches: SecurityCheckTask[][] = [];
    for (let i = 0; i < uncachedTasks.length; i += BATCH_SIZE) {
      batches.push(uncachedTasks.slice(i, i + BATCH_SIZE));
    }

    let completedTasks = 0;
    const totalTasks = uncachedTasks.length;

    const batchResults = await Promise.all(
      batches.map((batch) =>
        taskRunner.run(batch).then((results) => {
          completedTasks += batch.length;
          const lastTask = batch[batch.length - 1];
          progressCallback(`Running security check... (${completedTasks}/${totalTasks}) ${pc.dim(lastTask.filePath)}`);
          logger.trace(`Running security check... (${completedTasks}/${totalTasks}) ${lastTask.filePath}`);
          return results;
        }),
      ),
    );

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    logger.trace(`Security check completed in ${duration.toFixed(2)}ms`);

    // Populate cache with new results and collect non-null results
    const workerResults: SuspiciousFileResult[] = [];
    const flatResults = batchResults.flat();
    for (let i = 0; i < uncachedTasks.length; i++) {
      const task = uncachedTasks[i];
      const result = flatResults[i];
      const cacheKey = buildSecurityCacheKey(task.filePath, task.type);

      // Evict oldest entry if cache is full (FIFO via Map insertion order)
      if (securityResultCache.size >= MAX_SECURITY_CACHE_SIZE) {
        const oldestKey = securityResultCache.keys().next().value;
        if (oldestKey !== undefined) {
          securityResultCache.delete(oldestKey);
        }
      }
      securityResultCache.set(cacheKey, { contentLen: task.content.length, result });

      if (result) {
        workerResults.push(result);
      }
    }

    // Fire-and-forget worker pool cleanup — all results are already collected,
    // so we don't need to block the critical path waiting for thread termination.
    // The worker threads will be terminated when the process exits anyway (CLI tool).
    Promise.resolve(taskRunner.cleanup()).catch((error) => {
      logger.debug('Error during security worker pool cleanup:', error);
    });

    return [...cachedResults, ...workerResults];
  } catch (error) {
    logger.error('Error during security check:', error);
    // On error, still attempt cleanup but don't block on it
    Promise.resolve(taskRunner.cleanup()).catch(() => {});
    throw error;
  }
};
